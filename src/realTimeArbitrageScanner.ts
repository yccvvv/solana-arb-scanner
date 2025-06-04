import 'dotenv/config';
import { Connection, PublicKey } from '@solana/web3.js';
import { JupiterClient } from './utils/jupiterClient';
import { getTokenBySymbol } from './utils/tokenUtils';
import Decimal from 'decimal.js';
import * as path from 'path';
import axios from 'axios';
import WebSocket from 'ws';

// Use require for csv-writer to avoid ES module issues
const createCsvWriter = require('csv-writer');

interface RealTimePrice {
  source: 'websocket' | 'oracle' | 'pool_direct' | 'aggregator';
  dex: string;
  price: Decimal;
  liquidity: Decimal;
  timestamp: number;
  latency: number;
  confidence: number;
}

interface LiquidityDepth {
  bids: Array<{ price: Decimal; quantity: Decimal }>;
  asks: Array<{ price: Decimal; quantity: Decimal }>;
  totalBidLiquidity: Decimal;
  totalAskLiquidity: Decimal;
}

interface RealTimeArbitrageOpportunity {
  pair: string;
  buySource: RealTimePrice;
  sellSource: RealTimePrice;
  profit: Decimal;
  profitPercentage: Decimal;
  maxTradeSize: Decimal;
  executionTimeMs: number;
  confidence: 'high' | 'medium' | 'low';
  timestamp: number;
}

interface OraclePrice {
  symbol: string;
  price: Decimal;
  confidence: Decimal;
  timestamp: number;
  source: 'pyth' | 'switchboard' | 'chainlink';
}

class RealTimeArbitrageScanner {
  private connection: Connection;
  private jupiterClient: JupiterClient;
  private csvWriter: any;
  private csvFilePath: string = '';
  private isRunning: boolean = false;
  private priceCache: Map<string, RealTimePrice[]> = new Map();
  private oracleCache: Map<string, OraclePrice> = new Map();
  private websockets: Map<string, WebSocket> = new Map();
  private scanCounter: number = 0;

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    this.jupiterClient = new JupiterClient();
    this.setupCSVWriter();
  }

  private setupCSVWriter() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!require('fs').existsSync(dataDir)) {
      require('fs').mkdirSync(dataDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.csvFilePath = path.join(dataDir, `realtime_arbitrage_${timestamp}.csv`);

    this.csvWriter = createCsvWriter.createObjectCsvWriter({
      path: this.csvFilePath,
      header: [
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'pair', title: 'Trading Pair' },
        { id: 'buySource', title: 'Buy Source' },
        { id: 'sellSource', title: 'Sell Source' },
        { id: 'buyPrice', title: 'Buy Price' },
        { id: 'sellPrice', title: 'Sell Price' },
        { id: 'profitPercent', title: 'Profit (%)' },
        { id: 'maxTradeSize', title: 'Max Trade Size' },
        { id: 'executionTime', title: 'Execution Time (ms)' },
        { id: 'confidence', title: 'Confidence' },
        { id: 'buyLatency', title: 'Buy Source Latency (ms)' },
        { id: 'sellLatency', title: 'Sell Source Latency (ms)' },
        { id: 'dataQuality', title: 'Data Quality Score' }
      ]
    });

    console.log('✅ Real-Time Arbitrage Scanner initialized');
    console.log('📁 CSV output:', this.csvFilePath);
  }

  async startRealTimeScanning() {
    console.log('\n🚀 === REAL-TIME ARBITRAGE SCANNER ===');
    console.log('📡 Data Sources: WebSocket feeds, Oracle prices, Direct pool monitoring');
    console.log('⚡ Update Frequency: Real-time streaming (millisecond precision)');
    console.log('🎯 Methodology: Multi-source price discovery with liquidity analysis');
    console.log('');
    console.log('💡 REAL ARBITRAGE REQUIREMENTS:');
    console.log('   ✅ WebSocket price streams (not HTTP polling)');
    console.log('   ✅ Direct DEX pool monitoring');
    console.log('   ✅ Oracle price references (Pyth, Switchboard)');
    console.log('   ✅ Real-time liquidity depth analysis');
    console.log('   ✅ Sub-second execution timing');
    console.log('   ✅ MEV protection and front-running detection');
    console.log('');
    console.log('⚠️  IMPLEMENTATION STATUS:');
    console.log('   🔄 WebSocket integration: Demonstration mode');
    console.log('   🔄 Oracle feeds: Simulated (requires API keys)');
    console.log('   🔄 Pool monitoring: Limited to available APIs');
    console.log('   💰 Real trading: Requires significant additional development');
    console.log('='.repeat(80));

    this.isRunning = true;

    // Initialize real-time data sources
    await this.initializeWebSocketFeeds();
    await this.initializeOracleFeeds();
    await this.initializePoolMonitoring();

    // Start real-time scanning loop
    await this.runRealTimeScanningLoop();
  }

  private async initializeWebSocketFeeds() {
    console.log('\n📡 Initializing WebSocket Price Feeds...');
    
    // 1. Raydium WebSocket (if available)
    try {
      console.log('  🔌 Connecting to Raydium WebSocket...');
      // Note: This is a demonstration - actual Raydium WS endpoint would be different
      const raydiumWs = new WebSocket('wss://api.raydium.io/v2/ws'); // Hypothetical
      raydiumWs.on('open', () => {
        console.log('  ✅ Raydium WebSocket connected');
        // Subscribe to price updates
        raydiumWs.send(JSON.stringify({
          method: 'subscribe',
          params: ['priceUpdates']
        }));
      });
      raydiumWs.on('message', (data) => {
        this.handleRaydiumPriceUpdate(JSON.parse(data.toString()));
      });
      this.websockets.set('raydium', raydiumWs);
    } catch (error) {
      console.log('  ❌ Raydium WebSocket: Connection failed (expected in demo)');
    }

    // 2. Orca WebSocket (if available)
    try {
      console.log('  🔌 Connecting to Orca WebSocket...');
      // Note: Demonstration endpoint
      console.log('  ⚠️  Orca: No public WebSocket API available');
    } catch (error) {
      console.log('  ❌ Orca WebSocket: Not available');
    }

    // 3. Generic DEX aggregator WebSocket
    try {
      console.log('  🔌 Attempting DEX aggregator WebSocket...');
      console.log('  ⚠️  Most DEXes require authentication for real-time feeds');
    } catch (error) {
      console.log('  ❌ DEX WebSocket connections: Limited availability');
    }

    console.log('  📊 WebSocket Status: Demonstration mode (limited real endpoints)');
  }

  private async initializeOracleFeeds() {
    console.log('\n🔮 Initializing Oracle Price Feeds...');

    // 1. Pyth Network Integration
    try {
      console.log('  📊 Connecting to Pyth Network...');
      await this.connectToPythOracle();
    } catch (error) {
      console.log('  ❌ Pyth: Connection failed (requires proper setup)');
    }

    // 2. Switchboard Integration
    try {
      console.log('  📊 Connecting to Switchboard...');
      await this.connectToSwitchboardOracle();
    } catch (error) {
      console.log('  ❌ Switchboard: Connection failed (requires proper setup)');
    }

    // 3. Chainlink (if available on Solana)
    try {
      console.log('  📊 Checking Chainlink availability...');
      console.log('  ⚠️  Chainlink: Limited Solana integration');
    } catch (error) {
      console.log('  ❌ Chainlink: Not available on Solana');
    }

    console.log('  🎯 Oracle Status: Educational demonstration (requires API keys for production)');
  }

  private async initializePoolMonitoring() {
    console.log('\n🏊 Initializing Direct Pool Monitoring...');

    // 1. Raydium Pool Monitoring
    try {
      console.log('  🔍 Setting up Raydium pool monitoring...');
      await this.setupRaydiumPoolMonitoring();
    } catch (error) {
      console.log('  ❌ Raydium pools: Limited access');
    }

    // 2. Orca Pool Monitoring
    try {
      console.log('  🔍 Setting up Orca pool monitoring...');
      await this.setupOrcaPoolMonitoring();
    } catch (error) {
      console.log('  ❌ Orca pools: SDK integration required');
    }

    // 3. Meteora Pool Monitoring
    try {
      console.log('  🔍 Setting up Meteora pool monitoring...');
      console.log('  ⚠️  Meteora: Requires DLMM SDK integration');
    } catch (error) {
      console.log('  ❌ Meteora pools: SDK required');
    }

    console.log('  📈 Pool Monitoring: Demonstration with available APIs');
  }

  private async connectToPythOracle(): Promise<void> {
    // Demonstration: In production, you'd use @pythnetwork/client
    console.log('    🐍 Pyth: Would connect to real-time price feeds');
    console.log('    💡 Requires: @pythnetwork/client package and proper configuration');
    
    // Simulate oracle data
    const mockPythPrices = {
      'SOL/USD': { price: 153.45, confidence: 0.02, timestamp: Date.now() },
      'RAY/USD': { price: 2.18, confidence: 0.01, timestamp: Date.now() }
    };

    for (const [pair, data] of Object.entries(mockPythPrices)) {
      this.oracleCache.set(pair, {
        symbol: pair,
        price: new Decimal(data.price),
        confidence: new Decimal(data.confidence),
        timestamp: data.timestamp,
        source: 'pyth'
      });
    }

    console.log('    ✅ Pyth: Mock data initialized for demonstration');
  }

  private async connectToSwitchboardOracle(): Promise<void> {
    // Demonstration: In production, you'd use @switchboard-xyz/solana.js
    console.log('    🔄 Switchboard: Would connect to decentralized oracle feeds');
    console.log('    💡 Requires: @switchboard-xyz/solana.js package');
    
    console.log('    ✅ Switchboard: Mock integration ready');
  }

  private async setupRaydiumPoolMonitoring(): Promise<void> {
    // In production, you'd subscribe to specific pool accounts on-chain
    console.log('    🏊 Would monitor Raydium AMM pools directly on-chain');
    console.log('    💡 Requires: Real-time account change subscriptions');
    
    // Mock some pool monitoring
    setTimeout(() => {
      this.simulatePoolUpdate('Raydium', 'SOL/USDC', 153.789, 450000);
    }, 2000);
  }

  private async setupOrcaPoolMonitoring(): Promise<void> {
    console.log('    🐋 Would monitor Orca Whirlpool positions');
    console.log('    💡 Requires: @orca-so/whirlpools-sdk integration');
  }

  private async runRealTimeScanningLoop(): Promise<void> {
    console.log('\n⚡ Starting real-time scanning loop...');
    
    while (this.isRunning) {
      this.scanCounter++;
      console.log(`\n🔍 Real-Time Scan #${this.scanCounter} - ${new Date().toISOString()}`);
      
      await this.performRealTimeArbitrageScan();
      
      // Real-time: scan every 100ms instead of minutes
      await this.sleep(100);
    }
  }

  private async performRealTimeArbitrageScan(): Promise<void> {
    const tradingPairs = ['SOL/USDC', 'RAY/SOL', 'ORCA/SOL'];
    
    for (const pair of tradingPairs) {
      const opportunities = await this.findRealTimeArbitrageOpportunities(pair);
      
      if (opportunities.length > 0) {
        console.log(`  ⚡ ${pair}: ${opportunities.length} real-time opportunities detected`);
        for (const opp of opportunities) {
          console.log(`    💰 ${opp.profit.toFixed(6)} profit (${opp.profitPercentage.mul(100).toFixed(4)}%)`);
          console.log(`    🏪 ${opp.buySource.dex} → ${opp.sellSource.dex}`);
          console.log(`    ⏱️  Execution window: ${opp.executionTimeMs}ms`);
        }
        
        // Write opportunities to CSV
        await this.recordOpportunities(opportunities);
      } else {
        // Only log occasionally to avoid spam
        if (this.scanCounter % 100 === 0) {
          console.log(`  📊 ${pair}: No real-time opportunities (scan #${this.scanCounter})`);
        }
      }
    }
  }

  private async findRealTimeArbitrageOpportunities(pair: string): Promise<RealTimeArbitrageOpportunity[]> {
    const opportunities: RealTimeArbitrageOpportunity[] = [];
    
    // Get all real-time prices for this pair
    const prices = this.priceCache.get(pair) || [];
    const oraclePrice = this.oracleCache.get(pair);
    
    // Compare all price sources in real-time
    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const price1 = prices[i];
        const price2 = prices[j];
        
        // Check for arbitrage opportunity
        if (Math.abs(price1.price.sub(price2.price).toNumber()) > 0.001) {
          const buyPrice = price1.price.lt(price2.price) ? price1 : price2;
          const sellPrice = price1.price.gt(price2.price) ? price1 : price2;
          
          const profit = sellPrice.price.sub(buyPrice.price);
          const profitPercentage = profit.div(buyPrice.price);
          
          // Calculate maximum trade size based on liquidity
          const maxTradeSize = Decimal.min(buyPrice.liquidity, sellPrice.liquidity);
          
          // Estimate execution time based on source latencies
          const executionTime = buyPrice.latency + sellPrice.latency + 50; // +50ms for processing
          
          opportunities.push({
            pair,
            buySource: buyPrice,
            sellSource: sellPrice,
            profit,
            profitPercentage,
            maxTradeSize,
            executionTimeMs: executionTime,
            confidence: this.calculateRealTimeConfidence(buyPrice, sellPrice, oraclePrice),
            timestamp: Date.now()
          });
        }
      }
    }
    
    return opportunities.sort((a, b) => b.profit.cmp(a.profit));
  }

  private calculateRealTimeConfidence(
    buyPrice: RealTimePrice, 
    sellPrice: RealTimePrice, 
    oracle: OraclePrice | undefined
  ): 'high' | 'medium' | 'low' {
    let score = 0;
    
    // Factor 1: Source reliability
    if (buyPrice.source === 'websocket') score += 30;
    if (sellPrice.source === 'websocket') score += 30;
    
    // Factor 2: Latency
    if (buyPrice.latency < 100) score += 20;
    if (sellPrice.latency < 100) score += 20;
    
    // Factor 3: Oracle validation
    if (oracle) {
      const avgPrice = buyPrice.price.add(sellPrice.price).div(2);
      const oracleDiff = Math.abs(avgPrice.sub(oracle.price).div(oracle.price).toNumber());
      if (oracleDiff < 0.01) score += 30; // Within 1% of oracle
    }
    
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  private handleRaydiumPriceUpdate(data: any): void {
    // Handle incoming WebSocket price updates
    console.log('    📈 Raydium price update received');
    // Would parse and store real-time price data
  }

  private simulatePoolUpdate(dex: string, pair: string, price: number, liquidity: number): void {
    const currentPrices = this.priceCache.get(pair) || [];
    
    const newPrice: RealTimePrice = {
      source: 'pool_direct',
      dex,
      price: new Decimal(price),
      liquidity: new Decimal(liquidity),
      timestamp: Date.now(),
      latency: 15, // 15ms latency for direct pool access
      confidence: 0.95
    };
    
    currentPrices.push(newPrice);
    
    // Keep only recent prices (last 10 seconds)
    const cutoff = Date.now() - 10000;
    const recentPrices = currentPrices.filter(p => p.timestamp > cutoff);
    
    this.priceCache.set(pair, recentPrices);
    
    console.log(`    🔄 ${dex} ${pair}: Updated to ${price} (${liquidity} liquidity)`);
  }

  private async recordOpportunities(opportunities: RealTimeArbitrageOpportunity[]): Promise<void> {
    const records = opportunities.map(opp => ({
      timestamp: new Date(opp.timestamp).toISOString(),
      pair: opp.pair,
      buySource: opp.buySource.dex,
      sellSource: opp.sellSource.dex,
      buyPrice: opp.buySource.price.toNumber(),
      sellPrice: opp.sellSource.price.toNumber(),
      profitPercent: opp.profitPercentage.mul(100).toNumber(),
      maxTradeSize: opp.maxTradeSize.toNumber(),
      executionTime: opp.executionTimeMs,
      confidence: opp.confidence,
      buyLatency: opp.buySource.latency,
      sellLatency: opp.sellSource.latency,
      dataQuality: (opp.buySource.confidence + opp.sellSource.confidence) / 2
    }));

    try {
      await this.csvWriter.writeRecords(records);
    } catch (error) {
      console.error('❌ CSV write error:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop(): void {
    this.isRunning = false;
    
    // Close all WebSocket connections
    for (const [name, ws] of this.websockets) {
      console.log(`📡 Closing ${name} WebSocket connection`);
      ws.close();
    }
    
    console.log('\n⏹️  Real-time scanner stopped');
    console.log(`📁 Data saved to: ${this.csvFilePath}`);
  }
}

// Execute if run directly
if (require.main === module) {
  const scanner = new RealTimeArbitrageScanner();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⏹️  Received SIGINT, shutting down gracefully...');
    scanner.stop();
    process.exit(0);
  });

  scanner.startRealTimeScanning().catch(error => {
    console.error('❌ Real-time scanner error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  });
} 