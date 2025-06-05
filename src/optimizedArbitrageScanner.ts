import 'dotenv/config';
import { Connection } from '@solana/web3.js';
import { OptimizedPriceCollector, TokenPair, DEXPriceMap } from './utils/optimizedPriceCollector';
import { ArbitrageAnalyzer, ArbitrageAnalysisResult } from './utils/arbitrageAnalyzer';
import Decimal from 'decimal.js';
import * as path from 'path';

// Use require for csv-writer to avoid ES module issues
const createCsvWriter = require('csv-writer');

interface ScanResult {
  scanNumber: number;
  timestamp: string;
  pair: string;
  analysisResult: ArbitrageAnalysisResult;
  priceCollectionTime: number;
  analysisTime: number;
  totalTime: number;
}

interface ScanMetrics {
  totalScans: number;
  totalOpportunities: number;
  viableOpportunities: number;
  averageAnalysisTime: number;
  averageDataQuality: number;
  successfulPriceCollections: number;
  failedPriceCollections: number;
}

/**
 * Optimized Arbitrage Scanner with Parallel Price Collection
 * Implements the client's requested optimization strategy
 */
export class OptimizedArbitrageScanner {
  private connection: Connection;
  private priceCollector: OptimizedPriceCollector;
  private arbitrageAnalyzer: ArbitrageAnalyzer;
  private csvWriter: any;
  private csvFilePath: string = '';
  private scanCounter: number = 0;
  private scanResults: ScanResult[] = [];
  private metrics: ScanMetrics;

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    this.priceCollector = new OptimizedPriceCollector();
    this.arbitrageAnalyzer = new ArbitrageAnalyzer();
    this.metrics = this.initializeMetrics();
    this.setupCSVWriter();
  }

  private initializeMetrics(): ScanMetrics {
    return {
      totalScans: 0,
      totalOpportunities: 0,
      viableOpportunities: 0,
      averageAnalysisTime: 0,
      averageDataQuality: 0,
      successfulPriceCollections: 0,
      failedPriceCollections: 0
    };
  }

  private setupCSVWriter() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!require('fs').existsSync(dataDir)) {
      require('fs').mkdirSync(dataDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.csvFilePath = path.join(dataDir, `optimized_arbitrage_${timestamp}.csv`);

    this.csvWriter = createCsvWriter.createObjectCsvWriter({
      path: this.csvFilePath,
      header: [
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'scanNumber', title: 'Scan Number' },
        { id: 'pair', title: 'Trading Pair' },
        { id: 'totalOpportunities', title: 'Opportunities Found' },
        { id: 'viableOpportunities', title: 'Viable Opportunities' },
        { id: 'bestSpread', title: 'Best Spread (%)' },
        { id: 'bestBuyDex', title: 'Best Buy DEX' },
        { id: 'bestSellDex', title: 'Best Sell DEX' },
        { id: 'bestNetProfit', title: 'Best Net Profit' },
        { id: 'marketEfficiency', title: 'Market Efficiency' },
        { id: 'dataQuality', title: 'Data Quality' },
        { id: 'priceCollectionTime', title: 'Price Collection (ms)' },
        { id: 'analysisTime', title: 'Analysis Time (ms)' },
        { id: 'totalTime', title: 'Total Time (ms)' },
        { id: 'raydiumPrice', title: 'Raydium Price' },
        { id: 'raydiumResponseTime', title: 'Raydium Response (ms)' },
        { id: 'orcaPrice', title: 'Orca Price' },
        { id: 'orcaResponseTime', title: 'Orca Response (ms)' },
        { id: 'phoenixPrice', title: 'Phoenix Price' },
        { id: 'phoenixResponseTime', title: 'Phoenix Response (ms)' },
        { id: 'jupiterPrice', title: 'Jupiter Price' },
        { id: 'jupiterResponseTime', title: 'Jupiter Response (ms)' },
        { id: 'warnings', title: 'Warnings' },
        { id: 'recommendations', title: 'Recommendations' }
      ]
    });

    console.log('🚀 Optimized Arbitrage Scanner initialized');
    console.log('📁 CSV output:', this.csvFilePath);
  }

  /**
   * Start the optimized scanning process
   */
  async startOptimizedScanning(options: {
    pairs?: TokenPair[];
    scanInterval?: number;
    maxScans?: number;
    enableCaching?: boolean;
    logLevel?: 'verbose' | 'normal' | 'quiet';
  } = {}) {
    
    console.log('\n🚀 === OPTIMIZED ARBITRAGE SCANNER ===');
    console.log('⚡ Performance Optimization: Parallel Price Collection');
    console.log('🔄 Strategy: Promise.allSettled for fault tolerance');
    console.log('📊 Features: Statistical filtering, risk assessment, real-time metrics');
    console.log('🎯 Purpose: Demonstrate optimized data collection patterns');
    console.log('');
    console.log('🔧 OPTIMIZATIONS IMPLEMENTED:');
    console.log('   • Parallel API calls to Raydium, Orca, Phoenix, Jupiter');
    console.log('   • Fault-tolerant error handling with Promise.allSettled');
    console.log('   • Response time tracking and performance monitoring');
    console.log('   • Statistical outlier detection and filtering');
    console.log('   • Intelligent caching with expiry management');
    console.log('   • Risk scoring and confidence calculation');
    console.log('='.repeat(80));

    const opts = {
      pairs: this.getDefaultTradingPairs(),
      scanInterval: 30000, // 30 seconds
      maxScans: 100,
      enableCaching: false, // Real-time for arbitrage
      logLevel: 'normal' as const,
      ...options
    };

    console.log(`📈 Monitoring ${opts.pairs.length} trading pairs`);
    console.log(`⏱️  Scan interval: ${opts.scanInterval / 1000}s`);
    console.log(`🎯 Max scans: ${opts.maxScans}`);
    console.log(`📊 Optimizations: Parallel collection, statistical filtering`);
    console.log('');

    while (this.scanCounter < opts.maxScans) {
      this.scanCounter++;
      
      if (opts.logLevel !== 'quiet') {
        console.log(`\n🔍 OPTIMIZED SCAN CYCLE ${this.scanCounter}`);
        console.log('-'.repeat(60));
        console.log(`🕒 Start time: ${new Date().toISOString()}`);
      }

      const cycleStartTime = Date.now();
      
      // Process all pairs in parallel for maximum efficiency
      const scanPromises = opts.pairs.map(pair => 
        this.analyzePairOptimized(pair, opts.enableCaching, opts.logLevel)
      );

      const scanResults = await Promise.allSettled(scanPromises);
      
      // Process results
      const successfulScans = scanResults.filter(r => r.status === 'fulfilled')
                                         .map(r => (r as PromiseFulfilledResult<ScanResult>).value);
      
      const failedScans = scanResults.filter(r => r.status === 'rejected').length;

      const cycleTime = Date.now() - cycleStartTime;

      // Update metrics
      this.updateMetrics(successfulScans, failedScans);

      // Log cycle results
      if (opts.logLevel !== 'quiet') {
        console.log(`✅ Cycle completed in ${Math.round(cycleTime / 1000)}s`);
        console.log(`📊 Successful: ${successfulScans.length}, Failed: ${failedScans}`);
        
        const totalOpportunities = successfulScans.reduce((sum, scan) => 
          sum + scan.analysisResult.analysis.totalOpportunities, 0);
        const viableOpportunities = successfulScans.reduce((sum, scan) => 
          sum + scan.analysisResult.analysis.viableOpportunities, 0);
        
        console.log(`🎯 Opportunities: ${totalOpportunities} total, ${viableOpportunities} viable`);
        
        if (opts.logLevel === 'verbose') {
          this.logDetailedResults(successfulScans);
        }
      }

      // Write results to CSV
      await this.writeResultsToCSV(successfulScans);

      // Performance monitoring
      this.monitorPerformance();

      // Wait for next cycle
      if (this.scanCounter < opts.maxScans) {
        if (opts.logLevel !== 'quiet') {
          console.log(`⏳ Waiting ${opts.scanInterval / 1000}s before next scan...`);
        }
        await this.sleep(opts.scanInterval);
      }
    }

    console.log('\n🏁 Scanning completed!');
    console.log(`📊 Final Statistics:`);
    console.log(`   Total scans: ${this.metrics.totalScans}`);
    console.log(`   Total opportunities: ${this.metrics.totalOpportunities}`);
    console.log(`   Viable opportunities: ${this.metrics.viableOpportunities}`);
    console.log(`   Average analysis time: ${this.metrics.averageAnalysisTime.toFixed(1)}ms`);
    console.log(`   Average data quality: ${(this.metrics.averageDataQuality * 100).toFixed(1)}%`);
    console.log(`   Success rate: ${(this.metrics.successfulPriceCollections / (this.metrics.successfulPriceCollections + this.metrics.failedPriceCollections) * 100).toFixed(1)}%`);
  }

  /**
   * Analyze a single trading pair using optimized price collection
   */
  private async analyzePairOptimized(
    tokenPair: TokenPair, 
    enableCaching: boolean,
    logLevel: 'verbose' | 'normal' | 'quiet'
  ): Promise<ScanResult> {
    const scanStartTime = Date.now();
    
    try {
      if (logLevel === 'verbose') {
        console.log(`🔄 Analyzing ${tokenPair.from}/${tokenPair.to} with parallel collection...`);
      }

      // Phase 1: Optimized parallel price collection
      const priceCollectionStart = Date.now();
      
      // THIS IS THE CLIENT'S REQUESTED OPTIMIZATION:
      // Instead of multiple API calls per pair, implement parallel price collection
      const priceData = await this.priceCollector.collectRealPrices(tokenPair, {
        timeout: 3000,
        includeJupiterAggregated: true,
        enableCaching: enableCaching,
        cacheExpiryMs: 5000 // 5 second cache for arbitrage
      });
      
      const priceCollectionTime = Date.now() - priceCollectionStart;

      // Phase 2: Arbitrage analysis with statistical filtering
      const analysisStart = Date.now();
      
      const analysisResult = await this.arbitrageAnalyzer.analyzeArbitrageOpportunities(
        tokenPair,
        {
          minProfitThreshold: new Decimal(0.0005), // 0.05% minimum
          maxRiskScore: 0.8,
          includeGasCosts: true,
          estimatedGasPrice: new Decimal(0.005),
          maxPriceImpact: new Decimal(0.02),
          requireLiquidity: true,
          enableStatisticalFiltering: true
        }
      );

      const analysisTime = Date.now() - analysisStart;
      const totalTime = Date.now() - scanStartTime;

      // Log results
      if (logLevel === 'verbose') {
        console.log(`  ⚡ Price collection: ${priceCollectionTime}ms (${priceData.metadata.successfulSources}/${priceData.metadata.successfulSources + priceData.metadata.failedSources} sources)`);
        console.log(`  🧮 Analysis: ${analysisTime}ms`);
        console.log(`  📊 Found: ${analysisResult.opportunities.length} opportunities`);
        
        if (analysisResult.opportunities.length > 0) {
          const best = analysisResult.opportunities[0];
          console.log(`  🎯 Best: ${best.spreadPercentage.mul(100).toFixed(3)}% spread (${best.buyDex} → ${best.sellDex})`);
        }

        if (analysisResult.warnings.length > 0) {
          console.log(`  ⚠️  Warnings: ${analysisResult.warnings.length}`);
        }
      }

      return {
        scanNumber: this.scanCounter,
        timestamp: new Date().toISOString(),
        pair: `${tokenPair.from}/${tokenPair.to}`,
        analysisResult,
        priceCollectionTime,
        analysisTime,
        totalTime
      };

    } catch (error) {
      // Create error result
      const errorResult: ArbitrageAnalysisResult = {
        opportunities: [],
        priceData: { 
          metadata: { 
            totalResponseTime: 0, 
            successfulSources: 0, 
            failedSources: 1, 
            timestamp: Date.now(), 
            requestId: 'error' 
          } 
        },
        analysis: {
          totalOpportunities: 0,
          viableOpportunities: 0,
          averageSpread: new Decimal(0),
          maxSpread: new Decimal(0),
          marketEfficiency: 1,
          dataQuality: 0,
          analysisTime: 0
        },
        warnings: [`Analysis failed: ${(error as Error).message}`],
        recommendations: ['Check network connectivity and API endpoints']
      };

      return {
        scanNumber: this.scanCounter,
        timestamp: new Date().toISOString(),
        pair: `${tokenPair.from}/${tokenPair.to}`,
        analysisResult: errorResult,
        priceCollectionTime: 0,
        analysisTime: 0,
        totalTime: Date.now() - scanStartTime
      };
    }
  }

  /**
   * Get default trading pairs for scanning
   */
  private getDefaultTradingPairs(): TokenPair[] {
    return [
      { from: 'SOL', to: 'USDC', amount: new Decimal(1) },
      { from: 'SOL', to: 'USDT', amount: new Decimal(1) },
      { from: 'RAY', to: 'SOL', amount: new Decimal(100) },
      { from: 'RAY', to: 'USDC', amount: new Decimal(100) },
      { from: 'ORCA', to: 'SOL', amount: new Decimal(100) },
      { from: 'JUP', to: 'SOL', amount: new Decimal(100) },
      { from: 'BONK', to: 'SOL', amount: new Decimal(1000000) },
      { from: 'WIF', to: 'SOL', amount: new Decimal(100) }
    ];
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(successfulScans: ScanResult[], failedScans: number): void {
    this.metrics.totalScans += successfulScans.length + failedScans;
    this.metrics.successfulPriceCollections += successfulScans.length;
    this.metrics.failedPriceCollections += failedScans;

    const totalOpportunities = successfulScans.reduce((sum, scan) => 
      sum + scan.analysisResult.analysis.totalOpportunities, 0);
    const viableOpportunities = successfulScans.reduce((sum, scan) => 
      sum + scan.analysisResult.analysis.viableOpportunities, 0);
    
    this.metrics.totalOpportunities += totalOpportunities;
    this.metrics.viableOpportunities += viableOpportunities;

    // Update running averages
    const newAnalysisTime = successfulScans.reduce((sum, scan) => sum + scan.analysisTime, 0) / successfulScans.length;
    const newDataQuality = successfulScans.reduce((sum, scan) => sum + scan.analysisResult.analysis.dataQuality, 0) / successfulScans.length;

    this.metrics.averageAnalysisTime = (this.metrics.averageAnalysisTime + newAnalysisTime) / 2;
    this.metrics.averageDataQuality = (this.metrics.averageDataQuality + newDataQuality) / 2;
  }

  /**
   * Log detailed results for verbose mode
   */
  private logDetailedResults(scanResults: ScanResult[]): void {
    console.log('\n📋 Detailed Results:');
    
    scanResults.forEach(result => {
      const { pair, analysisResult, priceCollectionTime, analysisTime } = result;
      const { priceData, opportunities, analysis } = analysisResult;

      console.log(`\n  📊 ${pair}:`);
      console.log(`     Collection: ${priceCollectionTime}ms, Analysis: ${analysisTime}ms`);
      console.log(`     Sources: ${priceData.metadata.successfulSources} successful, ${priceData.metadata.failedSources} failed`);
      console.log(`     Quality: ${(analysis.dataQuality * 100).toFixed(1)}%, Efficiency: ${(analysis.marketEfficiency * 100).toFixed(1)}%`);
      
      if (opportunities.length > 0) {
        const best = opportunities[0];
        console.log(`     Best: ${best.spreadPercentage.mul(100).toFixed(3)}% (${best.buyDex} → ${best.sellDex})`);
      } else {
        console.log(`     No opportunities found`);
      }

      if (analysisResult.warnings.length > 0) {
        console.log(`     Warnings: ${analysisResult.warnings.slice(0, 2).join(', ')}`);
      }
    });
  }

  /**
   * Monitor and log performance metrics
   */
  private monitorPerformance(): void {
    // Clear expired cache entries periodically
    const cleared = this.priceCollector.clearExpiredCache();
    const cacheStats = this.priceCollector.getCacheStats();
    
    if (this.scanCounter % 10 === 0) { // Every 10 scans
      console.log(`\n📈 Performance Monitor (Scan ${this.scanCounter}):`);
      console.log(`   Cache: ${cacheStats.size} entries, ${cleared} expired cleared`);
      console.log(`   Success rate: ${(this.metrics.successfulPriceCollections / (this.metrics.successfulPriceCollections + this.metrics.failedPriceCollections) * 100).toFixed(1)}%`);
      console.log(`   Avg analysis time: ${this.metrics.averageAnalysisTime.toFixed(1)}ms`);
      console.log(`   Avg data quality: ${(this.metrics.averageDataQuality * 100).toFixed(1)}%`);
    }
  }

  /**
   * Write scan results to CSV
   */
  private async writeResultsToCSV(scanResults: ScanResult[]): Promise<void> {
    const csvRecords = scanResults.map(result => {
      const { analysisResult, priceCollectionTime, analysisTime, totalTime } = result;
      const { opportunities, priceData, analysis } = analysisResult;
      
      const bestOpportunity = opportunities.length > 0 ? opportunities[0] : null;

      return {
        timestamp: result.timestamp,
        scanNumber: result.scanNumber,
        pair: result.pair,
        totalOpportunities: analysis.totalOpportunities,
        viableOpportunities: analysis.viableOpportunities,
        bestSpread: bestOpportunity ? bestOpportunity.spreadPercentage.mul(100).toNumber() : 0,
        bestBuyDex: bestOpportunity ? bestOpportunity.buyDex : '',
        bestSellDex: bestOpportunity ? bestOpportunity.sellDex : '',
        bestNetProfit: bestOpportunity ? bestOpportunity.netProfit.toNumber() : 0,
        marketEfficiency: analysis.marketEfficiency,
        dataQuality: analysis.dataQuality,
        priceCollectionTime,
        analysisTime,
        totalTime,
        raydiumPrice: priceData.raydium ? priceData.raydium.price.toNumber() : 0,
        raydiumResponseTime: priceData.raydium ? priceData.raydium.responseTime : 0,
        orcaPrice: priceData.orca ? priceData.orca.price.toNumber() : 0,
        orcaResponseTime: priceData.orca ? priceData.orca.responseTime : 0,
        phoenixPrice: priceData.phoenix ? priceData.phoenix.price.toNumber() : 0,
        phoenixResponseTime: priceData.phoenix ? priceData.phoenix.responseTime : 0,
        jupiterPrice: priceData.jupiter ? priceData.jupiter.price.toNumber() : 0,
        jupiterResponseTime: priceData.jupiter ? priceData.jupiter.responseTime : 0,
        warnings: analysisResult.warnings.join('; '),
        recommendations: analysisResult.recommendations.join('; ')
      };
    });

    if (csvRecords.length > 0) {
      await this.csvWriter.writeRecords(csvRecords);
    }
  }

  /**
   * Utility: Sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): ScanMetrics {
    return { ...this.metrics };
  }

  /**
   * Get arbitrage statistics from analyzer
   */
  public getArbitrageStatistics() {
    return this.arbitrageAnalyzer.getArbitrageStatistics();
  }
}

// Export for testing and usage
export default OptimizedArbitrageScanner;

// CLI execution
if (require.main === module) {
  const scanner = new OptimizedArbitrageScanner();
  
  scanner.startOptimizedScanning({
    scanInterval: 30000, // 30 seconds
    maxScans: 50,
    enableCaching: false, // Real-time for arbitrage
    logLevel: 'normal'
  }).catch(error => {
    console.error('❌ Scanner error:', error);
    process.exit(1);
  });
} 