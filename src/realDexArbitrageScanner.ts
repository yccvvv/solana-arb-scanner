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
  requestId: string;
}

class RealDexArbitrageScanner {
  private jupiterClient: JupiterClient;
  private priceDataWriter: any;
  private csvFilePath: string = '';
  private isRunning: boolean = false;
  private scanCounter: number = 0;
  private totalRecords: number = 0;
  private startTime: number = 0;
  private requestCounter: number = 0;
  private lastRequestTime: number = 0;

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
    this.csvFilePath = path.join(dataDir, `real_dex_arbitrage_${timestamp}.csv`);

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
        { id: 'scanDurationMs', title: 'Scan Duration (ms)' },
        { id: 'requestId', title: 'Request ID' }
      ]
    });

    console.log(`📁 CSV data will be saved to: ${this.csvFilePath}`);
  }

  async startRealDexScanning() {
    console.log('\n🚀 REAL DEX ARBITRAGE SCANNER - NO SYNTHETIC DATA');
    console.log('═'.repeat(80));
    console.log('⏰ Respects 60 requests/minute limit (1 request per second)');
    console.log('🔄 Only real Solana DEX arbitrage opportunities');
    console.log('📊 Target: 200+ real arbitrage data points\n');

    this.isRunning = true;
    this.startTime = Date.now();

    // Conservative list - high-liquidity pairs only
    const tradingPairs = [
      { from: 'SOL', to: 'USDC', amount: new Decimal(1) },
      { from: 'SOL', to: 'USDT', amount: new Decimal(1) },
      { from: 'RAY', to: 'SOL', amount: new Decimal(100) },
      { from: 'ORCA', to: 'SOL', amount: new Decimal(100) },
      { from: 'JUP', to: 'SOL', amount: new Decimal(100) },
      { from: 'BONK', to: 'SOL', amount: new Decimal(1000000) },
      { from: 'WIF', to: 'SOL', amount: new Decimal(100) },
      { from: 'SAMO', to: 'SOL', amount: new Decimal(1000) },
      { from: 'RAY', to: 'USDC', amount: new Decimal(100) },
      { from: 'ORCA', to: 'USDC', amount: new Decimal(100) },
      { from: 'JUP', to: 'USDC', amount: new Decimal(100) },
      { from: 'BONK', to: 'USDC', amount: new Decimal(1000000) },
      { from: 'WIF', to: 'USDC', amount: new Decimal(100) },
      { from: 'RAY', to: 'ORCA', amount: new Decimal(100) },
      { from: 'RAY', to: 'JUP', amount: new Decimal(100) },
      { from: 'ORCA', to: 'JUP', amount: new Decimal(100) },
      { from: 'BONK', to: 'WIF', amount: new Decimal(1000000) },
      { from: 'WIF', to: 'SAMO', amount: new Decimal(100) },
      // Additional pairs more likely to use Phoenix AMM/CLMM
      { from: 'SOL', to: 'RAY', amount: new Decimal(1) },
      { from: 'USDC', to: 'SOL', amount: new Decimal(100) },
      { from: 'USDT', to: 'SOL', amount: new Decimal(100) },
      { from: 'JUP', to: 'RAY', amount: new Decimal(100) },
      { from: 'ORCA', to: 'RAY', amount: new Decimal(100) },
    ];

    console.log(`🎯 Scanning ${tradingPairs.length} high-quality pairs`);
    console.log(`⏱️  Estimated time to scan all pairs once: ${Math.ceil(tradingPairs.length * 4 / 60)} minutes\n`);

    while (this.isRunning) {
      this.scanCounter++;
      console.log(`\n🔄 REAL DEX SCAN #${this.scanCounter}`);
      console.log('═'.repeat(80));

      const scanStartTime = Date.now();
      await this.runRealDexScan(tradingPairs);
      const scanDuration = Date.now() - scanStartTime;

      const totalTime = Math.round((Date.now() - this.startTime) / 1000);
      const rps = this.requestCounter / Math.max(totalTime, 1);

      console.log(`\n✅ Scan #${this.scanCounter} completed in ${Math.round(scanDuration/1000)}s`);
      console.log(`📊 Total records: ${this.totalRecords} | Runtime: ${totalTime}s`);
      console.log(`📈 Request rate: ${rps.toFixed(2)} req/s | Total requests: ${this.requestCounter}`);

      // Stop after collecting substantial data
      if (this.totalRecords >= 200 || this.scanCounter >= 5) {
        console.log(`\n🎉 TARGET REACHED! Generated ${this.totalRecords} real DEX records`);
        break;
      }

      // Small delay between full scans to ensure we don't hit limits
      console.log(`⏳ Waiting 30 seconds before next scan cycle...`);
      await this.sleep(30000);
    }

    console.log(`\n📁 Final CSV saved to: ${this.csvFilePath}`);
    console.log(`📊 Total data points collected: ${this.totalRecords}`);
  }

  private async runRealDexScan(pairs: Array<{ from: string; to: string; amount: Decimal }>) {
    const scanStartTime = Date.now();
    const isoTimestamp = new Date().toISOString();
    let bestArbitrage: ArbitrageOpportunity | null = null;
    const allRecords: PriceDataRecord[] = [];

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      
      console.log(`🔍 [${i + 1}/${pairs.length}] ${pair.from}/${pair.to}`);
      
      try {
        // Rate limiting: ensure we don't exceed 1 request per second
        await this.respectRateLimit();
        
        const dexPrices = await this.getRealDexPrices(pair.from, pair.to, pair.amount);
        
        if (dexPrices.length >= 2) {
          const opportunities = this.findArbitrageOpportunities(dexPrices, `${pair.from}/${pair.to}`);
          
          if (opportunities.length > 0) {
            const best = opportunities[0];
            console.log(`   💰 Best: ${best.profitPercentage.toFixed(4)}% (${best.buyDex} → ${best.sellDex})`);
            
            if (!bestArbitrage || best.profitPercentage.gt(bestArbitrage.profitPercentage)) {
              bestArbitrage = best;
            }
          } else {
            console.log(`   ⚪ No arbitrage found between ${dexPrices.length} DEXes`);
          }

          // Convert to CSV records
          const csvRecords = this.convertToCsvRecords(
            dexPrices, 
            opportunities, 
            `${pair.from}/${pair.to}`, 
            isoTimestamp, 
            this.scanCounter,
            Date.now() - scanStartTime
          );
          allRecords.push(...csvRecords);
        } else {
          console.log(`   ❌ Insufficient real DEX data (${dexPrices.length} DEXes found)`);
        }

      } catch (error) {
        if (error instanceof Error && error.message.includes('429')) {
          console.log(`   ⏸️  Rate limited - waiting 2 minutes...`);
          await this.sleep(120000); // Wait 2 minutes on rate limit
        } else {
          console.log(`   ❌ Error: ${error instanceof Error ? error.message.slice(0, 50) : 'Unknown'}`);
        }
      }
    }

    // Mark best arbitrage of this scan
    if (bestArbitrage) {
      allRecords.forEach(record => {
        if (record.pair === bestArbitrage!.pair && 
            Math.abs(record.arbitrageProfitPercent - bestArbitrage!.profitPercentage.toNumber()) < 0.001) {
          record.bestArbitrageOfScan = true;
        }
      });
      
      console.log(`\n🏆 BEST REAL ARBITRAGE THIS SCAN:`);
      console.log(`💰 ${bestArbitrage.pair}: ${bestArbitrage.profitPercentage.toFixed(4)}%`);
      console.log(`🔄 ${bestArbitrage.buyDex} @ ${bestArbitrage.buyPrice.toFixed(8)} → ${bestArbitrage.sellDex} @ ${bestArbitrage.sellPrice.toFixed(8)}`);
    } else {
      console.log(`\n⚪ No real arbitrage opportunities found this scan`);
    }

    // Write all data to CSV
    if (allRecords.length > 0) {
      await this.writeDataToCSV(allRecords);
      this.totalRecords += allRecords.length;
      console.log(`💾 Wrote ${allRecords.length} new real DEX records to CSV`);
    }
  }

  private async respectRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // Ensure at least 2 seconds between requests to be extra safe with multiple calls
    if (timeSinceLastRequest < 2000) {
      const waitTime = 2000 - timeSinceLastRequest;
      await this.sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
    this.requestCounter++;
  }

  async getRealDexPrices(fromSymbol: string, toSymbol: string, amount: Decimal): Promise<DexPrice[]> {
    const fromToken = getTokenBySymbol(fromSymbol);
    const toToken = getTokenBySymbol(toSymbol);

    if (!fromToken || !toToken) {
      throw new Error(`Unknown token: ${fromSymbol} or ${toSymbol}`);
    }

    const dexPrices: DexPrice[] = [];
    const seenDexes = new Set<string>();

    // Multiple requests with different parameters to get more DEX variety
    const quoteParams = [
      { slippage: 50, onlyDirect: false },   // 0.5% slippage
      { slippage: 100, onlyDirect: true },   // 1% slippage, direct only
      { slippage: 300, onlyDirect: false },  // 3% slippage for more routes
    ];

    for (const params of quoteParams) {
      try {
        await this.respectRateLimit(); // Rate limit each call
        
        const quote = await this.jupiterClient.getQuote(
          fromToken.mint.toString(),
          toToken.mint.toString(),
          amount,
          fromToken.decimals,
          params.slippage
        );

        if (quote && quote.routePlan && quote.routePlan.length > 0) {
          for (const routePlan of quote.routePlan) {
            const dexLabel = routePlan.swapInfo.label;
            const dexName = this.extractDexName(dexLabel);
            
            if (!seenDexes.has(dexName) && dexName && dexName !== 'Unknown') {
              const outputAmount = new Decimal(quote.outAmount).div(
                new Decimal(10).pow(toToken.decimals)
              );
              const price = outputAmount.div(amount);
              const priceImpact = new Decimal(quote.priceImpactPct || 0);

              dexPrices.push({
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
        }

      } catch (error) {
        if (error instanceof Error && error.message.includes('429')) {
          console.log(`     ⏸️  Rate limited on quote ${params.slippage}bps - continuing...`);
          continue; // Skip this quote but continue with others
        }
        // Silently handle other errors
      }
    }

    return dexPrices;
  }

  private extractDexName(label: string): string {
    if (!label) return 'Unknown';
    
    const lowerLabel = label.toLowerCase();
    
    if (lowerLabel.includes('raydium')) return 'Raydium';
    if (lowerLabel.includes('orca')) return 'Orca';
    if (lowerLabel.includes('meteora')) return 'Meteora';
    if (lowerLabel.includes('phoenix clmm') || lowerLabel.includes('phoenix-clmm')) return 'Phoenix CLMM';
    if (lowerLabel.includes('phoenix amm') || lowerLabel.includes('phoenix-amm')) return 'Phoenix AMM';
    if (lowerLabel.includes('phoenix')) return 'Phoenix';
    if (lowerLabel.includes('openbook')) return 'OpenBook';
    if (lowerLabel.includes('whirlpool')) return 'Orca-Whirlpool';
    if (lowerLabel.includes('lifinity')) return 'Lifinity';
    if (lowerLabel.includes('solfi')) return 'SolFi';
    if (lowerLabel.includes('zerofi')) return 'ZeroFi';
    if (lowerLabel.includes('obric')) return 'Obric V2';
    if (lowerLabel.includes('stabble')) return 'Stabble';
    if (lowerLabel.includes('saros')) return 'Saros';
    if (lowerLabel.includes('aldrin')) return 'Aldrin';
    if (lowerLabel.includes('saber')) return 'Saber';
    if (lowerLabel.includes('mercurial')) return 'Mercurial';
    if (lowerLabel.includes('serum')) return 'Serum';
    if (lowerLabel.includes('balansol')) return 'Balansol';
    if (lowerLabel.includes('crema')) return 'Crema';
    if (lowerLabel.includes('cropper')) return 'Cropper';
    if (lowerLabel.includes('dradex')) return 'Dradex';
    if (lowerLabel.includes('fluxbeam')) return 'FluxBeam';
    if (lowerLabel.includes('helium')) return 'Helium';
    if (lowerLabel.includes('invariant')) return 'Invariant';
    if (lowerLabel.includes('sanctum')) return 'Sanctum';
    if (lowerLabel.includes('bonkswap')) return 'Bonkswap';
    
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

          // Only include meaningful arbitrage opportunities (>0.01%)
          if (profitPercentage.gte(0.01)) {
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
          }
        } else if (dex2.price.gt(dex1.price)) {
          const profit = dex2.price.sub(dex1.price);
          const profitPercentage = profit.div(dex1.price).mul(100);

          // Only include meaningful arbitrage opportunities (>0.01%)
          if (profitPercentage.gte(0.01)) {
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
        bestArbitrageOfScan: false,
        scanDurationMs: scanDuration,
        requestId: `${scanNumber}-${pair}-${dexPrice.dex}`
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
    console.log('\n🛑 Real DEX scanner stopped');
    console.log(`📁 Final data saved to: ${this.csvFilePath}`);
    console.log(`📊 Total records generated: ${this.totalRecords}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Handle graceful shutdown
const scanner = new RealDexArbitrageScanner();

process.on('SIGINT', () => {
  console.log('\n\n🛑 Received interrupt signal...');
  scanner.stop();
  process.exit(0);
});

// Start the real DEX scanner
scanner.startRealDexScanning().catch(error => {
  console.error('💥 Real DEX scanner failed:', error.message);
  process.exit(1);
}); 