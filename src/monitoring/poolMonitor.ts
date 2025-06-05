import WebSocket from 'ws';
import { EventEmitter } from 'events';
import Decimal from 'decimal.js';

// Types for real-time pool monitoring
export interface PoolUpdate {
  dex: string;
  pool: string;
  price: Decimal;
  liquidity: Decimal;
  volume24h: Decimal;
  priceChange24h: Decimal;
  timestamp: number;
  transactionCount: number;
  baseTokenAmount: Decimal;
  quoteTokenAmount: Decimal;
}

export interface PoolSubscription {
  poolAddress: string;
  dex: string;
  baseToken: string;
  quoteToken: string;
  isActive: boolean;
  lastUpdate: number;
  reconnectAttempts: number;
}

export interface DEXWebSocketConfig {
  endpoint: string;
  messageParser: (data: any) => PoolUpdate | null;
  subscriptionMessage: (poolAddress: string) => string;
  heartbeatInterval?: number;
  reconnectDelay?: number;
}

// DEX WebSocket endpoint configurations
const DEX_WEBSOCKET_ENDPOINTS: Record<string, DEXWebSocketConfig> = {
  raydium: {
    endpoint: 'wss://api.raydium.io/v2/ws',
    messageParser: parseRaydiumUpdate,
    subscriptionMessage: (pool) => JSON.stringify({
      method: 'subscribe',
      params: ['poolUpdate', pool]
    }),
    heartbeatInterval: 30000,
    reconnectDelay: 5000
  },
  orca: {
    endpoint: 'wss://api.orca.so/v1/ws',
    messageParser: parseOrcaUpdate,
    subscriptionMessage: (pool) => JSON.stringify({
      type: 'subscribe',
      channel: 'pool_updates',
      pool: pool
    }),
    heartbeatInterval: 25000,
    reconnectDelay: 3000
  },
  jupiter: {
    endpoint: 'wss://price-api.jup.ag/v1/ws',
    messageParser: parseJupiterUpdate,
    subscriptionMessage: (pool) => JSON.stringify({
      op: 'subscribe',
      topics: [`pool.${pool}`]
    }),
    heartbeatInterval: 20000,
    reconnectDelay: 2000
  },
  phoenix: {
    endpoint: 'wss://api.phoenix.trade/ws',
    messageParser: parsePhoenixUpdate,
    subscriptionMessage: (pool) => JSON.stringify({
      method: 'SUBSCRIBE',
      params: [pool],
      id: 1
    }),
    heartbeatInterval: 35000,
    reconnectDelay: 4000
  }
};

/**
 * Real-Time Pool Monitor with WebSocket Subscriptions
 * Provides live pool data for enhanced arbitrage detection
 */
export class PoolMonitor extends EventEmitter {
  private subscriptions: Map<string, WebSocket> = new Map();
  private poolSubscriptions: Map<string, PoolSubscription> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private isShuttingDown: boolean = false;
  private stats = {
    totalSubscriptions: 0,
    activeConnections: 0,
    messagesReceived: 0,
    reconnections: 0,
    errors: 0
  };

  constructor() {
    super();
    this.setupGracefulShutdown();
  }

  /**
   * Subscribe to real-time pool updates
   */
  async subscribeToPool(
    poolAddress: string, 
    dex: string, 
    baseToken: string, 
    quoteToken: string
  ): Promise<void> {
    const subscriptionKey = `${dex}_${poolAddress}`;
    
    if (this.poolSubscriptions.has(subscriptionKey)) {
      console.log(`📡 Already subscribed to ${dex} pool ${poolAddress}`);
      return;
    }

    const config = DEX_WEBSOCKET_ENDPOINTS[dex.toLowerCase()];
    if (!config) {
      throw new Error(`Unsupported DEX for WebSocket monitoring: ${dex}`);
    }

    console.log(`🔌 Subscribing to ${dex} pool: ${poolAddress}`);

    try {
      const ws = new WebSocket(config.endpoint);
      
      // Store subscription info
      this.poolSubscriptions.set(subscriptionKey, {
        poolAddress,
        dex,
        baseToken,
        quoteToken,
        isActive: false,
        lastUpdate: 0,
        reconnectAttempts: 0
      });

      this.setupWebSocketHandlers(ws, subscriptionKey, config);
      this.subscriptions.set(subscriptionKey, ws);
      this.stats.totalSubscriptions++;

    } catch (error) {
      console.error(`❌ Failed to subscribe to ${dex} pool ${poolAddress}:`, error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Unsubscribe from a pool
   */
  unsubscribeFromPool(poolAddress: string, dex: string): void {
    const subscriptionKey = `${dex}_${poolAddress}`;
    
    const ws = this.subscriptions.get(subscriptionKey);
    if (ws) {
      ws.close();
      this.subscriptions.delete(subscriptionKey);
    }

    this.poolSubscriptions.delete(subscriptionKey);
    this.clearHeartbeat(subscriptionKey);
    this.clearReconnectTimeout(subscriptionKey);

    console.log(`🔌 Unsubscribed from ${dex} pool ${poolAddress}`);
  }

  /**
   * Subscribe to multiple pools simultaneously
   */
  async subscribeToMultiplePools(pools: Array<{
    address: string;
    dex: string;
    baseToken: string;
    quoteToken: string;
  }>): Promise<void> {
    console.log(`📡 Subscribing to ${pools.length} pools simultaneously...`);
    
    const subscriptionPromises = pools.map(pool =>
      this.subscribeToPool(pool.address, pool.dex, pool.baseToken, pool.quoteToken)
        .catch(error => {
          console.error(`Failed to subscribe to ${pool.dex} pool ${pool.address}:`, error);
          return null;
        })
    );

    const results = await Promise.allSettled(subscriptionPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`✅ Successfully subscribed to ${successful}/${pools.length} pools`);
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(
    ws: WebSocket, 
    subscriptionKey: string, 
    config: DEXWebSocketConfig
  ): void {
    const subscription = this.poolSubscriptions.get(subscriptionKey)!;

    ws.on('open', () => {
      console.log(`✅ Connected to ${subscription.dex} WebSocket`);
      
      // Send subscription message
      const subscriptionMsg = config.subscriptionMessage(subscription.poolAddress);
      ws.send(subscriptionMsg);
      
      subscription.isActive = true;
      subscription.reconnectAttempts = 0;
      this.stats.activeConnections++;
      
      // Setup heartbeat
      this.setupHeartbeat(subscriptionKey, config);
      
      this.emit('connected', {
        dex: subscription.dex,
        pool: subscription.poolAddress
      });
    });

    ws.on('message', (data: Buffer) => {
      try {
        const rawData = data.toString();
        const parsedData = JSON.parse(rawData);
        
        const poolUpdate = config.messageParser(parsedData);
        if (poolUpdate) {
          subscription.lastUpdate = Date.now();
          this.stats.messagesReceived++;
          
          this.emit('priceUpdate', poolUpdate);
          this.emit(`update_${subscriptionKey}`, poolUpdate);
        }
      } catch (error) {
        console.error(`Error parsing message from ${subscription.dex}:`, error);
        this.stats.errors++;
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`🔌 Connection closed to ${subscription.dex}: ${code} ${reason}`);
      
      subscription.isActive = false;
      this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);
      this.clearHeartbeat(subscriptionKey);
      
      this.emit('disconnected', {
        dex: subscription.dex,
        pool: subscription.poolAddress,
        code,
        reason: reason.toString()
      });

      // Attempt reconnection if not shutting down
      if (!this.isShuttingDown && subscription.reconnectAttempts < 5) {
        this.scheduleReconnect(subscriptionKey, config);
      }
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for ${subscription.dex}:`, error);
      this.stats.errors++;
      
      this.emit('error', {
        dex: subscription.dex,
        pool: subscription.poolAddress,
        error: error.message
      });
    });
  }

  /**
   * Setup heartbeat to keep connection alive
   */
  private setupHeartbeat(subscriptionKey: string, config: DEXWebSocketConfig): void {
    if (!config.heartbeatInterval) return;

    const interval = setInterval(() => {
      const ws = this.subscriptions.get(subscriptionKey);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, config.heartbeatInterval);

    this.heartbeatIntervals.set(subscriptionKey, interval);
  }

  /**
   * Clear heartbeat interval
   */
  private clearHeartbeat(subscriptionKey: string): void {
    const interval = this.heartbeatIntervals.get(subscriptionKey);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(subscriptionKey);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(subscriptionKey: string, config: DEXWebSocketConfig): void {
    const subscription = this.poolSubscriptions.get(subscriptionKey);
    if (!subscription) return;

    subscription.reconnectAttempts++;
    const delay = config.reconnectDelay! * Math.pow(2, subscription.reconnectAttempts - 1);
    
    console.log(`🔄 Scheduling reconnect for ${subscription.dex} in ${delay}ms (attempt ${subscription.reconnectAttempts})`);

    const timeout = setTimeout(async () => {
      this.reconnectTimeouts.delete(subscriptionKey);
      
      try {
        await this.subscribeToPool(
          subscription.poolAddress,
          subscription.dex,
          subscription.baseToken,
          subscription.quoteToken
        );
        this.stats.reconnections++;
      } catch (error) {
        console.error(`Failed to reconnect to ${subscription.dex}:`, error);
      }
    }, delay);

    this.reconnectTimeouts.set(subscriptionKey, timeout);
  }

  /**
   * Clear reconnect timeout
   */
  private clearReconnectTimeout(subscriptionKey: string): void {
    const timeout = this.reconnectTimeouts.get(subscriptionKey);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(subscriptionKey);
    }
  }

  /**
   * Get real-time monitoring statistics
   */
  getMonitoringStats(): {
    totalSubscriptions: number;
    activeConnections: number;
    messagesReceived: number;
    reconnections: number;
    errors: number;
    subscriptions: Array<{
      pool: string;
      dex: string;
      isActive: boolean;
      lastUpdate: number;
      reconnectAttempts: number;
    }>;
  } {
    const subscriptions = Array.from(this.poolSubscriptions.values()).map(sub => ({
      pool: sub.poolAddress,
      dex: sub.dex,
      isActive: sub.isActive,
      lastUpdate: sub.lastUpdate,
      reconnectAttempts: sub.reconnectAttempts
    }));

    return {
      ...this.stats,
      subscriptions
    };
  }

  /**
   * Get active pool subscriptions
   */
  getActiveSubscriptions(): PoolSubscription[] {
    return Array.from(this.poolSubscriptions.values())
                .filter(sub => sub.isActive);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    console.log('🛑 Shutting down Pool Monitor...');

    // Close all WebSocket connections
    for (const [key, ws] of this.subscriptions) {
      ws.close();
      this.clearHeartbeat(key);
      this.clearReconnectTimeout(key);
    }

    // Clear all data structures
    this.subscriptions.clear();
    this.poolSubscriptions.clear();
    this.heartbeatIntervals.clear();
    this.reconnectTimeouts.clear();

    console.log('✅ Pool Monitor shutdown complete');
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }
}

// DEX-specific message parsers
function parseRaydiumUpdate(data: any): PoolUpdate | null {
  try {
    if (data.method !== 'poolUpdate') return null;

    const params = data.params;
    return {
      dex: 'Raydium',
      pool: params.pool,
      price: new Decimal(params.price || 0),
      liquidity: new Decimal(params.liquidity || 0),
      volume24h: new Decimal(params.volume24h || 0),
      priceChange24h: new Decimal(params.priceChange24h || 0),
      timestamp: Date.now(),
      transactionCount: params.transactionCount || 0,
      baseTokenAmount: new Decimal(params.baseAmount || 0),
      quoteTokenAmount: new Decimal(params.quoteAmount || 0)
    };
  } catch (error) {
    return null;
  }
}

function parseOrcaUpdate(data: any): PoolUpdate | null {
  try {
    if (data.type !== 'pool_update') return null;

    return {
      dex: 'Orca',
      pool: data.pool,
      price: new Decimal(data.price || 0),
      liquidity: new Decimal(data.liquidity || 0),
      volume24h: new Decimal(data.volume24h || 0),
      priceChange24h: new Decimal(data.priceChange24h || 0),
      timestamp: Date.now(),
      transactionCount: data.transactionCount || 0,
      baseTokenAmount: new Decimal(data.baseTokenAmount || 0),
      quoteTokenAmount: new Decimal(data.quoteTokenAmount || 0)
    };
  } catch (error) {
    return null;
  }
}

function parseJupiterUpdate(data: any): PoolUpdate | null {
  try {
    if (!data.topic || !data.topic.startsWith('pool.')) return null;

    const poolAddress = data.topic.split('.')[1];
    return {
      dex: 'Jupiter',
      pool: poolAddress,
      price: new Decimal(data.data.price || 0),
      liquidity: new Decimal(data.data.liquidity || 0),
      volume24h: new Decimal(data.data.volume24h || 0),
      priceChange24h: new Decimal(data.data.priceChange24h || 0),
      timestamp: Date.now(),
      transactionCount: data.data.transactionCount || 0,
      baseTokenAmount: new Decimal(data.data.baseTokenAmount || 0),
      quoteTokenAmount: new Decimal(data.data.quoteTokenAmount || 0)
    };
  } catch (error) {
    return null;
  }
}

function parsePhoenixUpdate(data: any): PoolUpdate | null {
  try {
    if (data.method !== 'SUBSCRIPTION') return null;

    const result = data.params.result;
    return {
      dex: 'Phoenix',
      pool: result.market,
      price: new Decimal(result.price || 0),
      liquidity: new Decimal(result.liquidity || 0),
      volume24h: new Decimal(result.volume24h || 0),
      priceChange24h: new Decimal(result.priceChange24h || 0),
      timestamp: Date.now(),
      transactionCount: result.transactionCount || 0,
      baseTokenAmount: new Decimal(result.baseTokenAmount || 0),
      quoteTokenAmount: new Decimal(result.quoteTokenAmount || 0)
    };
  } catch (error) {
    return null;
  }
} 