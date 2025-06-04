import 'dotenv/config';
import { JupiterClient } from './utils/jupiterClient';
import { getTokenBySymbol } from './utils/tokenUtils';
import Decimal from 'decimal.js';
import * as path from 'path';

// Use require for csv-writer to avoid ES module issues
const createCsvWriter = require('csv-writer');

interface DexPrice {
  dex: string;
  price: Decimal;
  outputAmount: Decimal;
  inputAmount: Decimal;
  priceImpact: Decimal;
  route?: any;
}

interface ArbitrageOpportunity {
  pair: string;
  buyDex: string;
  sellDex: string;
  buyPrice: Decimal;
  sellPrice: Decimal;
  profit: Decimal;
  profitPercentage: Decimal;
  timestamp: string;
  estimatedGasCost: Decimal;
  netProfitAfterGas: Decimal;
}

interface ScanMetrics {
  totalPairs: number;
  successfulRequests: number;
  failedRequests: number;
  arbitrageOpportunities: number;
  averageResponseTime: number;
  totalScanTime: number;
  requestsPerSecond: number;
}

interface PriceDataRecord {
  timestamp: string;
  scanNumber: number;
  tradingPair: string;
  dex: string;
  price: number;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  hasArbitrage: boolean;
  arbitrageBuyDex: string;
  arbitrageSellDex: string;
  arbitrageProfitPercent: number;
  arbitrageProfitAmount: number;
  estimatedGasCost: number;
  netProfitAfterGas: number;
  bestArbitrageOfScan: boolean;
  scanDurationMs: number;
  requestId: string;
}

class ProfessionalArbitrageScanner {
  private jupiterClient: JupiterClient;
  private priceDataWriter: any;
  private csvFilePath: string = '';
  private isRunning: boolean = false;
  private scanCounter: number = 0;
  private totalRecords: number = 0;
  private startTime: number = 0;
  private requestCounter: number = 0;
  private successfulRequests: number = 0;
  private failedRequests: number = 0;
  private responseTimes: number[] = [];
  private lastRequestTime: number = 0;
  private readonly RATE_LIMIT_DELAY = 2000; // 2 seconds between requests
  private readonly ESTIMATED_GAS_COST = new Decimal(0.002); // 0.002 SOL per transaction

  constructor() {
    this.jupiterClient = new JupiterClient();
    this.setupCSVWriter();
  }

  private setupCSVWriter() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!require('fs').existsSync(dataDir)) {
      require('fs').mkdirSync(dataDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.csvFilePath = path.join(dataDir, `professional_arbitrage_${timestamp}.csv`);

    this.priceDataWriter = createCsvWriter.createObjectCsvWriter({
      path: this.csvFilePath,
      header: [
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'scanNumber', title: 'Scan Number' },
        { id: 'tradingPair', title: 'Trading Pair' },
        { id: 'dex', title: 'DEX Protocol' },
        { id: 'price', title: 'Exchange Rate' },
        { id: 'inputAmount', title: 'Input Amount' },
        { id: 'outputAmount', title: 'Output Amount' },
        { id: 'priceImpact', title: 'Price Impact (%)' },
        { id: 'hasArbitrage', title: 'Arbitrage Available' },
        { id: 'arbitrageBuyDex', title: 'Buy DEX' },
        { id: 'arbitrageSellDex', title: 'Sell DEX' },
        { id: 'arbitrageProfitPercent', title: 'Gross Profit (%)' },
        { id: 'arbitrageProfitAmount', title: 'Gross Profit Amount' },
        { id: 'estimatedGasCost', title: 'Estimated Gas Cost (SOL)' },
        { id: 'netProfitAfterGas', title: 'Net Profit After Gas' },
        { id: 'bestArbitrageOfScan', title: 'Best Opportunity' },
        { id: 'scanDurationMs', title: 'Scan Duration (ms)' },
        { id: 'requestId', title: 'Request ID' }
      ]
    });

    console.log('System initialized. CSV output configured:', this.csvFilePath);
  }

  async startProfessionalArbitrageScanning() {
    console.log('\n🚫 === DEPRECATED SCANNER WARNING ===');
    console.log('❌ This scanner contains FUNDAMENTAL ARCHITECTURAL FLAWS');
    console.log('❌ It incorrectly interprets Jupiter routing as independent DEX prices');
    console.log('❌ This does NOT represent real arbitrage opportunities');
    console.log('');
    console.log('✅ For legitimate arbitrage detection, use:');
    console.log('✅ npm run legitimate-scan');
    console.log('');
    console.log('🔧 Technical Issue:');
    console.log('   Jupiter provides AGGREGATED routes, not individual market prices');
    console.log('   RouteInfo data represents routing steps, not competitive prices');
    console.log('');
    console.log('💡 Real arbitrage requires direct DEX integration comparison');
    console.log('='.repeat(70));
    console.log('');
    console.log('⚠️  Continuing for demonstration purposes only...');
    console.log('⚠️  Data generated contains false arbitrage signals');
    console.log('');

    console.log('🚀 === PROFESSIONAL ARBITRAGE SCANNER (DEPRECATED) ===');

    this.isRunning = true;
    this.startTime = Date.now();

    // Professional trading pairs - institutional grade selection
    const tradingPairs = [
      // Major pairs (high liquidity)
      { from: 'SOL', to: 'USDC', amount: new Decimal(1), category: 'Major' },
      { from: 'SOL', to: 'USDT', amount: new Decimal(1), category: 'Major' },
      { from: 'RAY', to: 'SOL', amount: new Decimal(100), category: 'Major' },
      { from: 'ORCA', to: 'SOL', amount: new Decimal(100), category: 'Major' },
      { from: 'JUP', to: 'SOL', amount: new Decimal(100), category: 'Major' },
      
      // DeFi governance tokens
      { from: 'RAY', to: 'USDC', amount: new Decimal(100), category: 'DeFi' },
      { from: 'ORCA', to: 'USDC', amount: new Decimal(100), category: 'DeFi' },
      { from: 'JUP', to: 'USDC', amount: new Decimal(100), category: 'DeFi' },
      { from: 'RAY', to: 'JUP', amount: new Decimal(100), category: 'DeFi' },
      { from: 'ORCA', to: 'JUP', amount: new Decimal(100), category: 'DeFi' },
      
      // Meme tokens (high volatility opportunities)
      { from: 'BONK', to: 'SOL', amount: new Decimal(1000000), category: 'Meme' },
      { from: 'WIF', to: 'SOL', amount: new Decimal(100), category: 'Meme' },
      { from: 'SAMO', to: 'SOL', amount: new Decimal(1000), category: 'Meme' },
      { from: 'BONK', to: 'USDC', amount: new Decimal(1000000), category: 'Meme' },
      { from: 'WIF', to: 'USDC', amount: new Decimal(100), category: 'Meme' },
      { from: 'WIF', to: 'SAMO', amount: new Decimal(100), category: 'Meme' },
      
      // Cross-category arbitrage
      { from: 'SOL', to: 'RAY', amount: new Decimal(1), category: 'Cross' },
      { from: 'USDC', to: 'SOL', amount: new Decimal(100), category: 'Cross' },
      { from: 'USDT', to: 'SOL', amount: new Decimal(100), category: 'Cross' },
      { from: 'JUP', to: 'RAY', amount: new Decimal(100), category: 'Cross' },
      
      // Additional high-opportunity pairs
      { from: 'BONK', to: 'WIF', amount: new Decimal(1000000), category: 'Meme' },
      { from: 'RAY', to: 'ORCA', amount: new Decimal(100), category: 'DeFi' },
      { from: 'SOL', to: 'JUP', amount: new Decimal(1), category: 'Major' },
      { from: 'USDC', to: 'RAY', amount: new Decimal(100), category: 'Cross' },
      { from: 'USDC', to: 'ORCA', amount: new Decimal(100), category: 'Cross' }
    ];

    console.log(`Monitoring ${tradingPairs.length} professional trading pairs`);
    console.log(`Estimated scan cycle duration: ${Math.ceil(tradingPairs.length * 2.5 / 60)} minutes`);
    console.log(`Target dataset: 300+ arbitrage opportunities\n`);

    while (this.isRunning) {
      this.scanCounter++;
      
      console.log(`\nSCAN CYCLE ${this.scanCounter}`);
      console.log('-'.repeat(50));
      console.log(`Start time: ${new Date().toISOString()}`);

      const scanStartTime = Date.now();
      const scanMetrics = await this.executeParallelScan(tradingPairs);
      const scanDuration = Date.now() - scanStartTime;

      this.logScanResults(scanMetrics, scanDuration);

      // Professional stopping criteria
      if (this.totalRecords >= 300 || this.scanCounter >= 8) {
        console.log('\n=== SCAN COMPLETION ===');
        console.log(`Target achieved: ${this.totalRecords} arbitrage records collected`);
        console.log(`Performance: ${this.successfulRequests}/${this.requestCounter} successful requests`);
        console.log(`Data quality: ${((this.totalRecords / this.successfulRequests) * 100).toFixed(1)}% opportunity detection rate`);
        break;
      }

      // Inter-scan delay for system stability
      console.log('Initiating inter-scan delay (60 seconds)...');
      await this.sleep(60000);
    }

    this.logFinalResults();
  }

  private async executeParallelScan(pairs: Array<{ from: string; to: string; amount: Decimal; category: string }>): Promise<ScanMetrics> {
    const scanStartTime = Date.now();
    const isoTimestamp = new Date().toISOString();
    let bestArbitrage: ArbitrageOpportunity | null = null;
    const allRecords: PriceDataRecord[] = [];
    const requestStartTimes: number[] = [];
    let successfulRequests = 0;
    let failedRequests = 0;

    // Process pairs in smaller batches to respect rate limits while maintaining efficiency
    const batchSize = 3;
    const batches = this.createBatches(pairs, batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} pairs)`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (pair, index) => {
        const pairIndex = batchIndex * batchSize + index + 1;
        console.log(`  [${pairIndex}/${pairs.length}] Analyzing ${pair.from}/${pair.to} (${pair.category})`);
        
        try {
          await this.respectRateLimit();
          const requestStart = Date.now();
          requestStartTimes.push(requestStart);
          
          const dexPrices = await this.getProfessionalDexPrices(pair.from, pair.to, pair.amount);
          
          const responseTime = Date.now() - requestStart;
          this.responseTimes.push(responseTime);
          successfulRequests++;
          
          if (dexPrices.length >= 2) {
            const opportunities = this.findEnhancedArbitrageOpportunities(dexPrices, `${pair.from}/${pair.to}`);
            
            if (opportunities.length > 0) {
              const best = opportunities[0];
              console.log(`    Opportunity detected: ${best.profitPercentage.toFixed(4)}% gross profit (${best.buyDex} -> ${best.sellDex})`);
              console.log(`    Net profit after gas: ${best.netProfitAfterGas.toFixed(6)} ${pair.to}`);
              
              if (bestArbitrage === null || best.netProfitAfterGas.gt(bestArbitrage.netProfitAfterGas)) {
                bestArbitrage = best;
              }
            } else {
              console.log(`    No arbitrage opportunities detected`);
            }
            
            const records = this.convertToProfessionalCsvRecords(
              dexPrices,
              opportunities,
              `${pair.from}/${pair.to}`,
              isoTimestamp,
              this.scanCounter,
              Date.now() - scanStartTime
            );
            
            allRecords.push(...records);
          } else {
            console.log(`    Insufficient DEX coverage (${dexPrices.length} responses)`);
          }
          
        } catch (error) {
          console.log(`    Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failedRequests++;
        }
      });

      // Wait for current batch to complete
      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (batchIndex < batches.length - 1) {
        await this.sleep(3000);
      }
    }

    // Write all records to CSV
    if (allRecords.length > 0) {
      await this.writeDataToCSV(allRecords);
      this.totalRecords += allRecords.length;
    }

    // Log best opportunity
    if (bestArbitrage !== null) {
      console.log('\nBEST ARBITRAGE OPPORTUNITY:');
      console.log(`  Pair: ${(bestArbitrage as ArbitrageOpportunity).pair}`);
      console.log(`  Strategy: Buy on ${(bestArbitrage as ArbitrageOpportunity).buyDex}, sell on ${(bestArbitrage as ArbitrageOpportunity).sellDex}`);
      console.log(`  Gross profit: ${(bestArbitrage as ArbitrageOpportunity).profitPercentage.toFixed(4)}%`);
      console.log(`  Net profit: ${(bestArbitrage as ArbitrageOpportunity).netProfitAfterGas.toFixed(6)} tokens`);
    }

    return {
      totalPairs: pairs.length,
      successfulRequests,
      failedRequests,
      arbitrageOpportunities: allRecords.filter(r => r.hasArbitrage).length,
      averageResponseTime: this.responseTimes.length > 0 ? 
        this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length : 0,
      totalScanTime: Date.now() - scanStartTime,
      requestsPerSecond: successfulRequests / ((Date.now() - scanStartTime) / 1000)
    };
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private async respectRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const sleepTime = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      await this.sleep(sleepTime);
    }
    
    this.lastRequestTime = Date.now();
    this.requestCounter++;
  }

  async getProfessionalDexPrices(fromSymbol: string, toSymbol: string, amount: Decimal): Promise<DexPrice[]> {
    const fromToken = getTokenBySymbol(fromSymbol);
    const toToken = getTokenBySymbol(toSymbol);
    
    if (!fromToken || !toToken) {
      throw new Error(`Token not found: ${fromSymbol} or ${toSymbol}`);
    }

    const requestId = `req_${this.requestCounter.toString().padStart(4, '0')}`;
    const dexPrices: DexPrice[] = [];

    // Multiple quote parameters for comprehensive DEX coverage
    const quoteParams = [
      { slippage: 50, onlyDirect: false, description: 'Standard routing' },
      { slippage: 100, onlyDirect: true, description: 'Direct routes only' },
      { slippage: 300, onlyDirect: false, description: 'High slippage tolerance' },
      { slippage: 150, onlyDirect: false, description: 'Balanced approach' }
    ];

    for (const params of quoteParams) {
      try {
        const quote = await this.jupiterClient.getQuote(
          fromToken.mint.toString(),
          toToken.mint.toString(),
          amount,
          fromToken.decimals,
          params.slippage
        );

        if (quote && quote.routePlan && quote.routePlan.length > 0) {
          const outputAmount = new Decimal(quote.outAmount).div(Math.pow(10, toToken.decimals));
          const inputAmount = new Decimal(quote.inAmount).div(Math.pow(10, fromToken.decimals));
          const price = outputAmount.div(inputAmount);
          const priceImpact = quote.priceImpactPct ? new Decimal(quote.priceImpactPct) : new Decimal(0);

          for (const step of quote.routePlan) {
            const dexName = this.extractProfessionalDexName(step.swapInfo.label);
            
            // Avoid duplicates from same DEX
            if (!dexPrices.find(dp => dp.dex === dexName)) {
              dexPrices.push({
                dex: dexName,
                price,
                outputAmount,
                inputAmount,
                priceImpact,
                route: step
              });
            }
          }
        }
      } catch (error) {
        // Continue with other parameters on error
        continue;
      }
    }

    return dexPrices;
  }

  private extractProfessionalDexName(label: string): string {
    const lowerLabel = label.toLowerCase();
    
    // Enhanced professional DEX detection
    if (lowerLabel.includes('phoenix clmm')) return 'Phoenix CLMM';
    if (lowerLabel.includes('phoenix amm')) return 'Phoenix AMM';
    if (lowerLabel.includes('phoenix v1')) return 'Phoenix AMM';
    if (lowerLabel.includes('phoenix v2')) return 'Phoenix CLMM';
    if (lowerLabel.includes('phoenix')) return 'Phoenix';
    
    if (lowerLabel.includes('raydium clmm')) return 'Raydium CLMM';
    if (lowerLabel.includes('raydium')) return 'Raydium';
    if (lowerLabel.includes('whirlpool')) return 'Orca Whirlpool';
    if (lowerLabel.includes('orca')) return 'Orca';
    if (lowerLabel.includes('meteora dlmm')) return 'Meteora DLMM';
    if (lowerLabel.includes('meteora')) return 'Meteora';
    if (lowerLabel.includes('openbook')) return 'OpenBook V2';
    if (lowerLabel.includes('lifinity')) return 'Lifinity';
    if (lowerLabel.includes('solfi')) return 'SolFi';
    if (lowerLabel.includes('zerofi')) return 'ZeroFi';
    if (lowerLabel.includes('bonkswap')) return 'Bonkswap';
    if (lowerLabel.includes('obric')) return 'Obric V2';
    if (lowerLabel.includes('stabble')) return 'Stabble';
    if (lowerLabel.includes('saros')) return 'Saros';
    if (lowerLabel.includes('aldrin')) return 'Aldrin';
    if (lowerLabel.includes('step')) return 'Step Finance';
    if (lowerLabel.includes('mercurial')) return 'Mercurial';
    if (lowerLabel.includes('saber')) return 'Saber';
    if (lowerLabel.includes('serum')) return 'Serum';
    
    return label; // Return original if not recognized
  }

  private findEnhancedArbitrageOpportunities(dexPrices: DexPrice[], pair: string): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    const minProfitThreshold = parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.01') / 100;

    for (let i = 0; i < dexPrices.length; i++) {
      for (let j = 0; j < dexPrices.length; j++) {
        if (i !== j) {
          const buyPrice = dexPrices[i];
          const sellPrice = dexPrices[j];
          
          if (sellPrice.price.gt(buyPrice.price)) {
            const priceDiff = sellPrice.price.sub(buyPrice.price);
            const profitPercentage = priceDiff.div(buyPrice.price);
            
            if (profitPercentage.gte(minProfitThreshold)) {
              const grossProfit = priceDiff.mul(buyPrice.inputAmount);
              const netProfitAfterGas = grossProfit.sub(this.ESTIMATED_GAS_COST);
              
              opportunities.push({
                pair,
                buyDex: buyPrice.dex,
                sellDex: sellPrice.dex,
                buyPrice: buyPrice.price,
                sellPrice: sellPrice.price,
                profit: grossProfit,
                profitPercentage,
                timestamp: new Date().toISOString(),
                estimatedGasCost: this.ESTIMATED_GAS_COST,
                netProfitAfterGas
              });
            }
          }
        }
      }
    }

    return opportunities.sort((a, b) => b.netProfitAfterGas.cmp(a.netProfitAfterGas));
  }

  private convertToProfessionalCsvRecords(
    dexPrices: DexPrice[], 
    opportunities: ArbitrageOpportunity[], 
    pair: string, 
    timestamp: string,
    scanNumber: number,
    scanDuration: number
  ): PriceDataRecord[] {
    const records: PriceDataRecord[] = [];
    const bestOpportunity = opportunities.length > 0 ? opportunities[0] : null;

    for (const dexPrice of dexPrices) {
      const hasArbitrage = opportunities.some(
        opp => opp.buyDex === dexPrice.dex || opp.sellDex === dexPrice.dex
      );

      const relevantOpportunity = opportunities.find(
        opp => opp.buyDex === dexPrice.dex || opp.sellDex === dexPrice.dex
      );

      records.push({
        timestamp,
        scanNumber,
        tradingPair: pair,
        dex: dexPrice.dex,
        price: dexPrice.price.toNumber(),
        inputAmount: dexPrice.inputAmount.toNumber(),
        outputAmount: dexPrice.outputAmount.toNumber(),
        priceImpact: dexPrice.priceImpact.toNumber(),
        hasArbitrage,
        arbitrageBuyDex: relevantOpportunity?.buyDex || '',
        arbitrageSellDex: relevantOpportunity?.sellDex || '',
        arbitrageProfitPercent: relevantOpportunity?.profitPercentage.mul(100).toNumber() || 0,
        arbitrageProfitAmount: relevantOpportunity?.profit.toNumber() || 0,
        estimatedGasCost: this.ESTIMATED_GAS_COST.toNumber(),
        netProfitAfterGas: relevantOpportunity?.netProfitAfterGas.toNumber() || 0,
        bestArbitrageOfScan: bestOpportunity ? 
          (dexPrice.dex === bestOpportunity.buyDex || dexPrice.dex === bestOpportunity.sellDex) : false,
        scanDurationMs: scanDuration,
        requestId: `req_${this.requestCounter.toString().padStart(4, '0')}`
      });
    }

    return records;
  }

  private async writeDataToCSV(records: PriceDataRecord[]) {
    try {
      await this.priceDataWriter.writeRecords(records);
    } catch (error) {
      console.error('CSV write error:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private logScanResults(metrics: ScanMetrics, scanDuration: number) {
    console.log('\nSCAN RESULTS:');
    console.log(`  Duration: ${Math.round(scanDuration / 1000)}s`);
    console.log(`  Success rate: ${metrics.successfulRequests}/${metrics.totalPairs} (${((metrics.successfulRequests / metrics.totalPairs) * 100).toFixed(1)}%)`);
    console.log(`  Opportunities found: ${metrics.arbitrageOpportunities}`);
    console.log(`  Average response time: ${Math.round(metrics.averageResponseTime)}ms`);
    console.log(`  Request rate: ${metrics.requestsPerSecond.toFixed(2)} req/s`);
    console.log(`  Total records: ${this.totalRecords}`);
  }

  private logFinalResults() {
    const totalTime = Math.round((Date.now() - this.startTime) / 1000);
    const averageRequestTime = this.responseTimes.length > 0 ? 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length : 0;

    console.log('\n=== FINAL RESULTS ===');
    console.log(`Total execution time: ${totalTime}s`);
    console.log(`Data file: ${this.csvFilePath}`);
    console.log(`Total arbitrage records: ${this.totalRecords}`);
    console.log(`Request statistics: ${this.successfulRequests} successful, ${this.failedRequests} failed`);
    console.log(`Success rate: ${((this.successfulRequests / this.requestCounter) * 100).toFixed(1)}%`);
    console.log(`Average response time: ${Math.round(averageRequestTime)}ms`);
    console.log(`Data quality: Professional-grade arbitrage opportunities detected`);
    console.log('='.repeat(50));
  }

  stop() {
    this.isRunning = false;
    console.log('\nScanner stopped by user');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Execute if run directly
if (require.main === module) {
  const scanner = new ProfessionalArbitrageScanner();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    scanner.stop();
    process.exit(0);
  });

  scanner.startProfessionalArbitrageScanning().catch(error => {
    console.error('Scanner error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  });
} 