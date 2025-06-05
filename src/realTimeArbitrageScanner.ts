import 'dotenv/config';
import { Connection, PublicKey } from '@solana/web3.js';
import { JupiterClient } from './utils/jupiterClient';
import { getTokenBySymbol } from './utils/tokenUtils';
import Decimal from 'decimal.js';
import * as path from 'path';
import axios from 'axios';
import WebSocket from 'ws';
import { PoolMonitor, PoolUpdate } from './monitoring/poolMonitor';
import { OptimizedPriceCollector } from './utils/optimizedPriceCollector';
import { ArbitrageAnalyzer, ArbitrageOpportunity } from './utils/arbitrageAnalyzer';

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

interface RealTimeOpportunity extends ArbitrageOpportunity {
  detectionLatency: number; // Time from price update to opportunity detection
  poolUpdateTimestamp: number;
  isRealTime: boolean;
  triggeringSources: string[];
}

interface MonitoringConfig {
  poolAddresses: Array<{
    address: string;
    dex: string;
    baseToken: string;
    quoteToken: string;
    priority: number;
  }>;
  opportunityThresholds: {
    minProfitPercentage: number;
    maxRiskScore: number;
    minLiquidityUSD: number;
  };
  alerting: {
    enableAlerts: boolean;
    discordWebhook?: string;
    telegramBot?: string;
  };
}

/**
 * Real-Time Arbitrage Scanner with WebSocket Pool Monitoring
 * Provides instant arbitrage detection using live pool data streams
 */
export class RealTimeArbitrageScanner {
  private connection: Connection;
  private jupiterClient: JupiterClient;
  private csvWriter: any;
  private csvFilePath: string = '';
  private isRunning: boolean = false;
  private priceCache: Map<string, RealTimePrice[]> = new Map();
  private oracleCache: Map<string, OraclePrice> = new Map();
  private websockets: Map<string, WebSocket> = new Map();
  private scanCounter: number = 0;
  private poolMonitor: PoolMonitor;
  private priceCollector: OptimizedPriceCollector;
  private arbitrageAnalyzer: ArbitrageAnalyzer;
  private realTimeOpportunities: RealTimeOpportunity[] = [];
  private opportunityCounter: number = 0;
  private stats = {
    poolUpdatesReceived: 0,
    opportunitiesDetected: 0,
    avgDetectionLatency: 0,
    highValueOpportunities: 0,
    totalProfitPotential: new Decimal(0)
  };

  constructor(config: MonitoringConfig) {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    this.jupiterClient = new JupiterClient();
    this.setupCSVWriter();
    this.poolMonitor = new PoolMonitor();
    this.priceCollector = new OptimizedPriceCollector();
    this.arbitrageAnalyzer = new ArbitrageAnalyzer();
    this.setupEventHandlers();
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

  /**
   * Setup event handlers for pool monitoring
   */
  private setupEventHandlers(): void {
    // Handle real-time price updates
    this.poolMonitor.on('priceUpdate', (update: PoolUpdate) => {
      this.handlePoolUpdate(update);
    });

    // Handle connection events
    this.poolMonitor.on('connected', (event) => {
      console.log(`✅ Connected to ${event.dex} pool ${event.pool}`);
    });

    this.poolMonitor.on('disconnected', (event) => {
      console.log(`🔌 Disconnected from ${event.dex} pool ${event.pool}`);
    });

    this.poolMonitor.on('error', (event) => {
      console.error(`❌ WebSocket error for ${event.dex}:`, event.error);
    });
  }

  /**
   * Handle incoming pool updates for arbitrage detection
   */
  private async handlePoolUpdate(update: PoolUpdate): Promise<void> {
    const updateReceived = Date.now();
    this.stats.poolUpdatesReceived++;

    try {
      // Skip if price is zero or liquidity is too low
      if (update.price.eq(0) || update.liquidity.lt(10000)) {
        return;
      }

      // Detect arbitrage opportunities across all monitored pools
      const opportunities = await this.detectCrossPoolArbitrage(update, updateReceived);

      if (opportunities.length > 0) {
        this.stats.opportunitiesDetected += opportunities.length;
        
        // Process each opportunity
        for (const opportunity of opportunities) {
          await this.processRealTimeOpportunity(opportunity);
        }
      }

    } catch (error) {
      console.error('Error processing pool update:', error);
    }
  }

  /**
   * Detect arbitrage opportunities across multiple pools
   */
  private async detectCrossPoolArbitrage(
    triggerUpdate: PoolUpdate, 
    updateReceived: number
  ): Promise<RealTimeOpportunity[]> {
    const detectionStart = Date.now();
    const opportunities: RealTimeOpportunity[] = [];

    try {
      // Get the base/quote token pair from the triggering update
      const baseToken = this.extractBaseToken(triggerUpdate.pool);
      const quoteToken = this.extractQuoteToken(triggerUpdate.pool);

      if (!baseToken || !quoteToken) return opportunities;

      // Quick price check across other DEXes for the same pair
      const otherPools = this.poolMonitor.getActiveSubscriptions()
        .filter(sub => 
          sub.poolAddress !== triggerUpdate.pool && 
          this.isMatchingTokenPair(sub, baseToken, quoteToken)
        );

      for (const pool of otherPools) {
        // Compare prices for arbitrage opportunity
        const opportunity = await this.calculateRealTimeArbitrage(
          triggerUpdate,
          pool,
          baseToken,
          quoteToken,
          updateReceived,
          detectionStart
        );

        if (opportunity) {
          opportunities.push(opportunity);
        }
      }

    } catch (error) {
      console.error('Error in cross-pool arbitrage detection:', error);
    }

    return opportunities;
  }

  /**
   * Calculate real-time arbitrage opportunity
   */
  private async calculateRealTimeArbitrage(
    triggerUpdate: PoolUpdate,
    comparePool: any,
    baseToken: string,
    quoteToken: string,
    updateReceived: number,
    detectionStart: number
  ): Promise<RealTimeOpportunity | null> {
    
    // Get recent price for comparison pool (this would come from cached WebSocket data)
    const recentPrice = await this.getRecentPoolPrice(comparePool.poolAddress, comparePool.dex);
    
    if (!recentPrice || recentPrice.price.eq(0)) return null;

    // Calculate price difference
    const priceDiff = triggerUpdate.price.sub(recentPrice.price).abs();
    const spreadPercentage = priceDiff.div(triggerUpdate.price);

    // Quick profitability check
    if (spreadPercentage.lt(0.0005)) return null; // Less than 0.05%

    // Determine buy/sell direction
    const isBuyFromTrigger = triggerUpdate.price.lt(recentPrice.price);
    
    const buyDex = isBuyFromTrigger ? triggerUpdate.dex : comparePool.dex;
    const sellDex = isBuyFromTrigger ? comparePool.dex : triggerUpdate.dex;
    const buyPrice = isBuyFromTrigger ? triggerUpdate.price : recentPrice.price;
    const sellPrice = isBuyFromTrigger ? recentPrice.price : triggerUpdate.price;

    // Calculate estimated profit
    const tradeAmount = new Decimal(1000); // $1000 trade size
    const grossProfit = tradeAmount.mul(spreadPercentage);
    const estimatedGas = new Decimal(0.01); // ~$10 in gas/fees
    const netProfit = grossProfit.sub(estimatedGas);

    if (netProfit.lte(0)) return null;

    const detectionLatency = Date.now() - detectionStart;

    return {
      pair: `${baseToken}/${quoteToken}`,
      buyDex,
      sellDex,
      buyPrice,
      sellPrice,
      spread: sellPrice.sub(buyPrice),
      spreadPercentage,
      estimatedProfit: grossProfit,
      estimatedGas,
      netProfit,
      confidence: Math.min(0.9, 1 - detectionLatency / 1000), // Higher confidence for faster detection
      riskScore: Math.max(0.1, detectionLatency / 500), // Higher risk for slower detection
      liquidityScore: Math.min(1, triggerUpdate.liquidity.div(100000).toNumber()),
      priceImpactTotal: new Decimal(0.002), // Estimated 0.2% impact
      strategy: 'direct_arbitrage' as const,
      timestamp: Date.now(),
      requestId: `realtime_${++this.opportunityCounter}`,
      responseTimeAdvantage: 1000 - detectionLatency,
      marketEfficiency: 1 - spreadPercentage.toNumber(),
      
      // Real-time specific fields
      detectionLatency,
      poolUpdateTimestamp: triggerUpdate.timestamp,
      isRealTime: true,
      triggeringSources: [triggerUpdate.dex, comparePool.dex]
    };
  }

  /**
   * Process and handle real-time arbitrage opportunity
   */
  private async processRealTimeOpportunity(opportunity: RealTimeOpportunity): Promise<void> {
    this.realTimeOpportunities.push(opportunity);
    
    // Keep only recent opportunities (last 100)
    if (this.realTimeOpportunities.length > 100) {
      this.realTimeOpportunities = this.realTimeOpportunities.slice(-100);
    }

    // Update statistics
    this.stats.totalProfitPotential = this.stats.totalProfitPotential.add(opportunity.netProfit);
    
    if (opportunity.netProfit.gt(50)) { // High-value opportunity (>$50)
      this.stats.highValueOpportunities++;
    }

    // Update average detection latency
    this.stats.avgDetectionLatency = (this.stats.avgDetectionLatency + opportunity.detectionLatency) / 2;

    // Log significant opportunities
    if (opportunity.spreadPercentage.gt(0.001)) { // > 0.1%
      console.log(`🎯 REAL-TIME OPPORTUNITY DETECTED:`);
      console.log(`   Pair: ${opportunity.pair}`);
      console.log(`   Spread: ${opportunity.spreadPercentage.mul(100).toFixed(3)}%`);
      console.log(`   Profit: $${opportunity.netProfit.toFixed(2)}`);
      console.log(`   Route: ${opportunity.buyDex} → ${opportunity.sellDex}`);
      console.log(`   Detection: ${opportunity.detectionLatency}ms`);
      console.log(`   Confidence: ${(opportunity.confidence * 100).toFixed(1)}%\n`);
    }

    // Write to CSV
    await this.writeOpportunityToCSV(opportunity);

    // Send alerts for high-value opportunities
    if (opportunity.netProfit.gt(100)) { // > $100 profit
      await this.sendAlert(opportunity);
    }
  }

  /**
   * Setup opportunity monitoring and thresholds
   */
  private setupOpportunityMonitoring(config: MonitoringConfig): void {
    // Monitor for stale opportunities and cleanup
    setInterval(() => {
      const now = Date.now();
      const staleThreshold = 10000; // 10 seconds
      
      this.realTimeOpportunities = this.realTimeOpportunities.filter(
        opp => (now - opp.timestamp) < staleThreshold
      );
    }, 5000);
  }

  /**
   * Start periodic logging of statistics
   */
  private startPeriodicLogging(): void {
    setInterval(() => {
      const monitorStats = this.poolMonitor.getMonitoringStats();
      
      console.log(`📊 Real-Time Stats (last minute):`);
      console.log(`   Pool updates: ${this.stats.poolUpdatesReceived}`);
      console.log(`   Opportunities: ${this.stats.opportunitiesDetected}`);
      console.log(`   Avg detection: ${this.stats.avgDetectionLatency.toFixed(1)}ms`);
      console.log(`   High-value ops: ${this.stats.highValueOpportunities}`);
      console.log(`   Active connections: ${monitorStats.activeConnections}`);
      console.log(`   Total profit potential: $${this.stats.totalProfitPotential.toFixed(2)}\n`);
      
      // Reset counters
      this.stats.poolUpdatesReceived = 0;
      this.stats.opportunitiesDetected = 0;
      this.stats.highValueOpportunities = 0;
    }, 60000); // Every minute
  }

  /**
   * Helper methods
   */
  private extractBaseToken(poolAddress: string): string | null {
    // This would extract base token from pool address
    // Implementation depends on specific pool address format
    return 'SOL'; // Simplified for demo
  }

  private extractQuoteToken(poolAddress: string): string | null {
    // This would extract quote token from pool address  
    return 'USDC'; // Simplified for demo
  }

  private isMatchingTokenPair(pool: any, baseToken: string, quoteToken: string): boolean {
    return pool.baseToken === baseToken && pool.quoteToken === quoteToken;
  }

  private async getRecentPoolPrice(poolAddress: string, dex: string): Promise<PoolUpdate | null> {
    // This would return cached recent price data from pool monitoring
    // For demo purposes, simulate with random price
    return {
      dex,
      pool: poolAddress,
      price: new Decimal(185 + (Math.random() - 0.5) * 2), // SOL price simulation
      liquidity: new Decimal(1000000),
      volume24h: new Decimal(50000),
      priceChange24h: new Decimal(0.02),
      timestamp: Date.now(),
      transactionCount: 100,
      baseTokenAmount: new Decimal(5000),
      quoteTokenAmount: new Decimal(925000)
    };
  }

  /**
   * CSV Export Setup
   */
  private setupCSVExport(): void {
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
        { id: 'pair', title: 'Pair' },
        { id: 'buyDex', title: 'Buy DEX' },
        { id: 'sellDex', title: 'Sell DEX' },
        { id: 'spread', title: 'Spread %' },
        { id: 'netProfit', title: 'Net Profit' },
        { id: 'detectionLatency', title: 'Detection (ms)' },
        { id: 'confidence', title: 'Confidence' },
        { id: 'isRealTime', title: 'Real-Time' },
        { id: 'triggeringSources', title: 'Sources' }
      ]
    });
  }

  private async writeOpportunityToCSV(opportunity: RealTimeOpportunity): Promise<void> {
    const record = {
      timestamp: new Date(opportunity.timestamp).toISOString(),
      pair: opportunity.pair,
      buyDex: opportunity.buyDex,
      sellDex: opportunity.sellDex,
      spread: opportunity.spreadPercentage.mul(100).toNumber(),
      netProfit: opportunity.netProfit.toNumber(),
      detectionLatency: opportunity.detectionLatency,
      confidence: opportunity.confidence,
      isRealTime: opportunity.isRealTime,
      triggeringSources: opportunity.triggeringSources.join(', ')
    };

    await this.csvWriter.writeRecords([record]);
  }

  private async sendAlert(opportunity: RealTimeOpportunity): Promise<void> {
    // Implementation for Discord/Telegram alerts
    console.log(`🚨 HIGH-VALUE ALERT: $${opportunity.netProfit.toFixed(2)} profit opportunity!`);
  }

  /**
   * Get current real-time statistics
   */
  public getRealTimeStats() {
    return {
      ...this.stats,
      recentOpportunities: this.realTimeOpportunities.slice(-10),
      monitoringStats: this.poolMonitor.getMonitoringStats()
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Real-Time Arbitrage Scanner...');
    await this.poolMonitor.shutdown();
    console.log('✅ Shutdown complete');
  }

  /**
   * Start real-time monitoring with WebSocket subscriptions
   */
  async startRealTimeMonitoring(config: MonitoringConfig): Promise<void> {
    console.log('🚀 Starting Real-Time Arbitrage Scanner');
    console.log('⚡ Features: WebSocket monitoring, instant detection, live alerts');
    console.log('='.repeat(80));

    try {
      // Subscribe to high-priority pools
      const prioritizedPools = config.poolAddresses.sort((a, b) => b.priority - a.priority);
      
      console.log(`📡 Subscribing to ${prioritizedPools.length} pool streams...`);
      
      await this.poolMonitor.subscribeToMultiplePools(prioritizedPools.map(pool => ({
        address: pool.address,
        dex: pool.dex,
        baseToken: pool.baseToken,
        quoteToken: pool.quoteToken
      })));

      // Setup opportunity monitoring
      this.setupOpportunityMonitoring(config);

      console.log('✅ Real-time monitoring active');
      console.log('🎯 Waiting for arbitrage opportunities...\n');

      // Log periodic statistics
      this.startPeriodicLogging();

    } catch (error) {
      console.error('❌ Failed to start real-time monitoring:', error);
      throw error;
    }
  }
}

// Example usage and configuration
const defaultConfig: MonitoringConfig = {
  poolAddresses: [
    // High-priority SOL pools
    { address: 'raydium_sol_usdc_pool', dex: 'raydium', baseToken: 'SOL', quoteToken: 'USDC', priority: 10 },
    { address: 'orca_sol_usdc_pool', dex: 'orca', baseToken: 'SOL', quoteToken: 'USDC', priority: 9 },
    { address: 'jupiter_sol_usdc_pool', dex: 'jupiter', baseToken: 'SOL', quoteToken: 'USDC', priority: 8 },
    
    // Other major pairs
    { address: 'raydium_ray_sol_pool', dex: 'raydium', baseToken: 'RAY', quoteToken: 'SOL', priority: 7 },
    { address: 'orca_orca_sol_pool', dex: 'orca', baseToken: 'ORCA', quoteToken: 'SOL', priority: 6 }
  ],
  opportunityThresholds: {
    minProfitPercentage: 0.05, // 0.05%
    maxRiskScore: 0.8,
    minLiquidityUSD: 10000
  },
  alerting: {
    enableAlerts: true
  }
};

// CLI execution
if (require.main === module) {
  const scanner = new RealTimeArbitrageScanner(defaultConfig);
  
  scanner.startRealTimeMonitoring(defaultConfig)
    .catch((error: Error) => {
      console.error('❌ Real-time scanner error:', error);
      process.exit(1);
    });
} 