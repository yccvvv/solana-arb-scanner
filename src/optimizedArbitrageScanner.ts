import 'dotenv/config';
import { JupiterClient } from './utils/jupiterClient';
import { getTokenBySymbol } from './utils/tokenUtils';
import Decimal from 'decimal.js';
import path from 'path';

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
}

interface PriceDataRecord {
  timestamp: string;
  scanNumber: number;
  pair: string;
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
  bestArbitrageOfScan: boolean;
  scanDurationMs: number;
}

interface ScanBatch {
  pairs: Array<{ from: string; to: string; amount: Decimal }>;
  batchId: number;
}

class OptimizedArbitrageScanner {
  private jupiterClient: JupiterClient;
  private priceDataWriter: any;
  private csvFilePath: string = '';
  private isRunning: boolean = false;
  private scanCounter: number = 0;
  private totalRecords: number = 0;
  private startTime: number = 0;

  constructor() {
    this.jupiterClient = new JupiterClient();
    this.setupCSVWriter();
  }

  private setupCSVWriter() {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!require('fs').existsSync(dataDir)) {
      require('fs').mkdirSync(dataDir, { recursive: true });
    }

    // Create CSV file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.csvFilePath = path.join(dataDir, `optimized_arbitrage_${timestamp}.csv`);

    this.priceDataWriter = createCsvWriter.createObjectCsvWriter({
      path: this.csvFilePath,
      header: [
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'scanNumber', title: 'Scan Number' },
        { id: 'pair', title: 'Trading Pair' },
        { id: 'dex', title: 'DEX' },
        { id: 'price', title: 'Price' },
        { id: 'inputAmount', title: 'Input Amount' },
        { id: 'outputAmount', title: 'Output Amount' },
        { id: 'priceImpact', title: 'Price Impact (%)' },
        { id: 'hasArbitrage', title: 'Has Arbitrage' },
        { id: 'arbitrageBuyDex', title: 'Arbitrage Buy DEX' },
        { id: 'arbitrageSellDex', title: 'Arbitrage Sell DEX' },
        { id: 'arbitrageProfitPercent', title: 'Arbitrage Profit (%)' },
        { id: 'arbitrageProfitAmount', title: 'Arbitrage Profit Amount' },
        { id: 'bestArbitrageOfScan', title: 'Best Arbitrage of Scan' },
        { id: 'scanDurationMs', title: 'Scan Duration (ms)' }
      ]
    });

    console.log(`📁 CSV data will be saved to: ${this.csvFilePath}`);
  }

  async startOptimizedScanning() {
    console.log('\n🚀 OPTIMIZED PARALLEL ARBITRAGE SCANNER');
    console.log('═'.repeat(80));
    console.log('⚡ Parallel scanning for maximum data collection');
    console.log('📊 Building comprehensive CSV for client demonstration');
    console.log('🎯 Target: 1000+ records across multiple DEXes\n');

    this.isRunning = true;
    this.startTime = Date.now();

    // Expanded list of trading pairs - optimized for variety and liquidity
    const allPairs = [
      // Major pairs - high liquidity
      { from: 'SOL', to: 'USDC', amount: new Decimal(1) },
      { from: 'SOL', to: 'USDT', amount: new Decimal(1) },
      
      // DeFi tokens with SOL
      { from: 'RAY', to: 'SOL', amount: new Decimal(100) },
      { from: 'ORCA', to: 'SOL', amount: new Decimal(100) },
      { from: 'JUP', to: 'SOL', amount: new Decimal(100) },
      { from: 'SRM', to: 'SOL', amount: new Decimal(100) },
      { from: 'FIDA', to: 'SOL', amount: new Decimal(100) },
      { from: 'MNGO', to: 'SOL', amount: new Decimal(100) },
      
      // Meme tokens - high volatility
      { from: 'BONK', to: 'SOL', amount: new Decimal(1000000) },
      { from: 'WIF', to: 'SOL', amount: new Decimal(100) },
      { from: 'SAMO', to: 'SOL', amount: new Decimal(1000) },
      
      // Gaming tokens
      { from: 'ATLAS', to: 'SOL', amount: new Decimal(10000) },
      { from: 'POLIS', to: 'SOL', amount: new Decimal(1000) },
      { from: 'GMT', to: 'SOL', amount: new Decimal(100) },
      
      // Less common tokens
      { from: 'STEP', to: 'SOL', amount: new Decimal(100) },
      { from: 'COPE', to: 'SOL', amount: new Decimal(100) },
      { from: 'SLND', to: 'SOL', amount: new Decimal(100) },
      
      // USDC pairs for more arbitrage opportunities
      { from: 'RAY', to: 'USDC', amount: new Decimal(100) },
      { from: 'ORCA', to: 'USDC', amount: new Decimal(100) },
      { from: 'JUP', to: 'USDC', amount: new Decimal(100) },
      { from: 'BONK', to: 'USDC', amount: new Decimal(1000000) },
      { from: 'WIF', to: 'USDC', amount: new Decimal(100) },
      { from: 'SAMO', to: 'USDC', amount: new Decimal(1000) },
      { from: 'GMT', to: 'USDC', amount: new Decimal(100) },
      
      // USDT pairs
      { from: 'RAY', to: 'USDT', amount: new Decimal(100) },
      { from: 'ORCA', to: 'USDT', amount: new Decimal(100) },
      { from: 'JUP', to: 'USDT', amount: new Decimal(100) },
      { from: 'WIF', to: 'USDT', amount: new Decimal(100) },
      
      // Token-to-token pairs (often have best arbitrage)
      { from: 'RAY', to: 'ORCA', amount: new Decimal(100) },
      { from: 'RAY', to: 'JUP', amount: new Decimal(100) },
      { from: 'ORCA', to: 'JUP', amount: new Decimal(100) },
      { from: 'BONK', to: 'WIF', amount: new Decimal(1000000) },
      { from: 'BONK', to: 'SAMO', amount: new Decimal(1000000) },
      { from: 'WIF', to: 'SAMO', amount: new Decimal(100) },
      { from: 'ATLAS', to: 'POLIS', amount: new Decimal(1000) },
      { from: 'FIDA', to: 'SRM', amount: new Decimal(100) },
      { from: 'GMT', to: 'STEP', amount: new Decimal(100) },
    ];

    // Create batches for parallel processing
    const batchSize = 6; // Process 6 pairs at once to avoid rate limits
    const batches = this.createBatches(allPairs, batchSize);

    console.log(`📦 Created ${batches.length} batches with ${batchSize} pairs each`);
    console.log(`🎯 Total pairs to scan: ${allPairs.length}`);

    while (this.isRunning) {
      this.scanCounter++;
      console.log(`\n🔄 PARALLEL SCAN #${this.scanCounter}`);
      console.log('═'.repeat(100));

      const scanStartTime = Date.now();
      await this.runParallelScan(batches);
      const scanDuration = Date.now() - scanStartTime;

      const totalTime = Math.round((Date.now() - this.startTime) / 1000);
      console.log(`\n✅ Scan #${this.scanCounter} completed in ${scanDuration}ms`);
      console.log(`📊 Total records: ${this.totalRecords} | Runtime: ${totalTime}s`);
      console.log(`📈 Average: ${Math.round(this.totalRecords / this.scanCounter)} records/scan`);

      // Stop after collecting substantial data (or run indefinitely)
      if (this.totalRecords >= 2000) {
        console.log(`\n🎉 TARGET REACHED! Generated ${this.totalRecords} records for client demo`);
        break;
      }

      // Delay between complete scans
      await this.sleep(10000); // 10 seconds between full scans
    }

    console.log(`\n📁 Final CSV saved to: ${this.csvFilePath}`);
    console.log(`📊 Total data points collected: ${this.totalRecords}`);
  }

  private createBatches(pairs: Array<{ from: string; to: string; amount: Decimal }>, batchSize: number): ScanBatch[] {
    const batches: ScanBatch[] = [];
    for (let i = 0; i < pairs.length; i += batchSize) {
      batches.push({
        pairs: pairs.slice(i, i + batchSize),
        batchId: Math.floor(i / batchSize) + 1
      });
    }
    return batches;
  }

  private async runParallelScan(batches: ScanBatch[]) {
    const scanStartTime = Date.now();
    const isoTimestamp = new Date().toISOString();

    for (const batch of batches) {
      console.log(`\n📦 Processing Batch ${batch.batchId} (${batch.pairs.length} pairs):`);
      
      // Process all pairs in this batch in parallel
      const batchPromises = batch.pairs.map(async (pair, index) => {
        try {
          console.log(`   🔍 [${batch.batchId}.${index + 1}] ${pair.from}/${pair.to}`);
          const dexPrices = await this.getPricesFromAllDexes(pair.from, pair.to, pair.amount);
          
          if (dexPrices.length >= 2) {
            const opportunities = this.findArbitrageOpportunities(dexPrices, `${pair.from}/${pair.to}`);
            
            // Show quick summary
            if (opportunities.length > 0) {
              const best = opportunities[0];
              console.log(`   💰 Best: ${best.profitPercentage.toFixed(3)}% (${best.buyDex} → ${best.sellDex})`);
            }
            
            return {
              pair: `${pair.from}/${pair.to}`,
              dexPrices,
              opportunities,
              scanDuration: Date.now() - scanStartTime
            };
          }
        } catch (error) {
          console.log(`   ❌ ${pair.from}/${pair.to}: ${error instanceof Error ? error.message.slice(0, 50) : 'Error'}`);
        }
        return null;
      });

      // Wait for all pairs in this batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process results and convert to CSV
      const batchData: PriceDataRecord[] = [];
      let bestArbitrage: ArbitrageOpportunity | null = null;

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const { pair, dexPrices, opportunities, scanDuration } = result.value;
          
          // Track best arbitrage across all batches
          if (opportunities.length > 0 && (!bestArbitrage || opportunities[0].profitPercentage.gt(bestArbitrage.profitPercentage))) {
            bestArbitrage = opportunities[0];
          }

          // Convert to CSV records
          const csvRecords = this.convertToCsvRecords(
            dexPrices, 
            opportunities, 
            pair, 
            isoTimestamp, 
            this.scanCounter,
            scanDuration
          );
          batchData.push(...csvRecords);
        }
      });

      // Mark best arbitrage for this batch
      if (bestArbitrage) {
        batchData.forEach(record => {
          if (record.pair === bestArbitrage!.pair && 
              Math.abs(record.arbitrageProfitPercent - bestArbitrage!.profitPercentage.toNumber()) < 0.001) {
            record.bestArbitrageOfScan = true;
          }
        });
      }

      // Write batch data to CSV immediately
      if (batchData.length > 0) {
        await this.writeDataToCSV(batchData);
        this.totalRecords += batchData.length;
        console.log(`   💾 Batch ${batch.batchId}: ${batchData.length} records written`);
      }

      // Small delay between batches to respect rate limits
      await this.sleep(2000);
    }
  }

  async getPricesFromAllDexes(fromSymbol: string, toSymbol: string, amount: Decimal): Promise<DexPrice[]> {
    const fromToken = getTokenBySymbol(fromSymbol);
    const toToken = getTokenBySymbol(toSymbol);

    if (!fromToken || !toToken) {
      throw new Error(`Unknown token: ${fromSymbol} or ${toSymbol}`);
    }

    const dexPrices: DexPrice[] = [];
    const seenDexes = new Set<string>();

    // Optimized quote requests for speed
    const quoteRequests = [
      { slippage: 50, onlyDirect: false },
      { slippage: 100, onlyDirect: true },
      { slippage: 200, onlyDirect: false },
    ];

    const requestPromises = quoteRequests.map(async (request) => {
      try {
        const quote = await this.jupiterClient.getQuote(
          fromToken.mint.toString(),
          toToken.mint.toString(),
          amount,
          fromToken.decimals,
          request.slippage
        );

        if (quote && quote.routePlan && quote.routePlan.length > 0) {
          const newDexPrices: DexPrice[] = [];
          
          for (const routePlan of quote.routePlan) {
            const dexLabel = routePlan.swapInfo.label;
            const dexName = this.extractDexName(dexLabel);
            
            if (!seenDexes.has(dexName) && dexName && dexName !== 'Unknown') {
              const outputAmount = new Decimal(quote.outAmount).div(
                new Decimal(10).pow(toToken.decimals)
              );
              const price = outputAmount.div(amount);
              const priceImpact = new Decimal(quote.priceImpactPct || 0);

              newDexPrices.push({
                dex: dexName,
                price,
                outputAmount,
                inputAmount: amount,
                priceImpact,
                route: routePlan
              });
              
              seenDexes.add(dexName);
            }
          }
          return newDexPrices;
        }
      } catch (error) {
        // Silently continue on errors to maintain speed
      }
      return [];
    });

    // Run all quote requests in parallel
    const results = await Promise.allSettled(requestPromises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        dexPrices.push(...result.value);
      }
    });

    return dexPrices;
  }

  private extractDexName(label: string): string {
    if (!label) return 'Unknown';
    
    const lowerLabel = label.toLowerCase();
    
    if (lowerLabel.includes('raydium')) return 'Raydium';
    if (lowerLabel.includes('orca')) return 'Orca';
    if (lowerLabel.includes('meteora')) return 'Meteora';
    if (lowerLabel.includes('phoenix')) return 'Phoenix';
    if (lowerLabel.includes('openbook')) return 'OpenBook';
    if (lowerLabel.includes('whirlpool')) return 'Orca-Whirlpool';
    if (lowerLabel.includes('lifinity')) return 'Lifinity';
    if (lowerLabel.includes('solfi')) return 'SolFi';
    if (lowerLabel.includes('zerofi')) return 'ZeroFi';
    if (lowerLabel.includes('obric')) return 'Obric V2';
    if (lowerLabel.includes('stabble')) return 'Stabble Stable Swap';
    if (lowerLabel.includes('saros')) return 'Saros';
    if (lowerLabel.includes('aldrin')) return 'Aldrin';
    if (lowerLabel.includes('saber')) return 'Saber';
    if (lowerLabel.includes('mercurial')) return 'Mercurial';
    if (lowerLabel.includes('serum')) return 'Serum';
    
    if (lowerLabel.length > 2 && !lowerLabel.includes('unknown')) {
      return label;
    }
    
    return 'Unknown';
  }

  private findArbitrageOpportunities(dexPrices: DexPrice[], pair: string): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    for (let i = 0; i < dexPrices.length; i++) {
      for (let j = i + 1; j < dexPrices.length; j++) {
        const dex1 = dexPrices[i];
        const dex2 = dexPrices[j];

        if (dex1.price.gt(dex2.price)) {
          const profit = dex1.price.sub(dex2.price);
          const profitPercentage = profit.div(dex2.price).mul(100);

          opportunities.push({
            pair,
            buyDex: dex2.dex,
            sellDex: dex1.dex,
            buyPrice: dex2.price,
            sellPrice: dex1.price,
            profit,
            profitPercentage,
            timestamp: new Date().toISOString()
          });
        } else if (dex2.price.gt(dex1.price)) {
          const profit = dex2.price.sub(dex1.price);
          const profitPercentage = profit.div(dex1.price).mul(100);

          opportunities.push({
            pair,
            buyDex: dex1.dex,
            sellDex: dex2.dex,
            buyPrice: dex1.price,
            sellPrice: dex2.price,
            profit,
            profitPercentage,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return opportunities.sort((a, b) => b.profitPercentage.sub(a.profitPercentage).toNumber());
  }

  private convertToCsvRecords(
    dexPrices: DexPrice[], 
    opportunities: ArbitrageOpportunity[], 
    pair: string, 
    timestamp: string,
    scanNumber: number,
    scanDuration: number
  ): PriceDataRecord[] {
    const records: PriceDataRecord[] = [];

    dexPrices.forEach(dexPrice => {
      // Find best arbitrage opportunity involving this DEX
      const arbitrageOpp = opportunities.find(opp => 
        opp.buyDex === dexPrice.dex || opp.sellDex === dexPrice.dex
      );

      records.push({
        timestamp,
        scanNumber,
        pair,
        dex: dexPrice.dex,
        price: dexPrice.price.toNumber(),
        inputAmount: dexPrice.inputAmount.toNumber(),
        outputAmount: dexPrice.outputAmount.toNumber(),
        priceImpact: dexPrice.priceImpact.toNumber(),
        hasArbitrage: !!arbitrageOpp,
        arbitrageBuyDex: arbitrageOpp?.buyDex || '',
        arbitrageSellDex: arbitrageOpp?.sellDex || '',
        arbitrageProfitPercent: arbitrageOpp?.profitPercentage.toNumber() || 0,
        arbitrageProfitAmount: arbitrageOpp?.profit.toNumber() || 0,
        bestArbitrageOfScan: false, // Will be set later
        scanDurationMs: scanDuration
      });
    });

    return records;
  }

  private async writeDataToCSV(records: PriceDataRecord[]) {
    try {
      await this.priceDataWriter.writeRecords(records);
    } catch (error) {
      console.error('❌ Error writing to CSV:', error);
    }
  }

  stop() {
    this.isRunning = false;
    console.log('\n🛑 Optimized scanner stopped');
    console.log(`📁 Final data saved to: ${this.csvFilePath}`);
    console.log(`📊 Total records generated: ${this.totalRecords}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Handle graceful shutdown
const scanner = new OptimizedArbitrageScanner();

process.on('SIGINT', () => {
  console.log('\n\n🛑 Received interrupt signal...');
  scanner.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received terminate signal...');
  scanner.stop();
  process.exit(0);
});

// Start the optimized scanner
scanner.startOptimizedScanning().catch(error => {
  console.error('💥 Optimized scanner failed:', error.message);
  process.exit(1);
}); 