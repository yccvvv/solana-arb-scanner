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
  phoenixProtocol: string;
}

class PhoenixFocusedScanner {
  private jupiterClient: JupiterClient;
  private priceDataWriter: any;
  private csvFilePath: string = '';
  private isRunning: boolean = false;
  private scanCounter: number = 0;
  private totalRecords: number = 0;
  private phoenixRecords: number = 0;
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
    this.csvFilePath = path.join(dataDir, `phoenix_focused_arbitrage_${timestamp}.csv`);

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
        { id: 'requestId', title: 'Request ID' },
        { id: 'phoenixProtocol', title: 'Phoenix Protocol' }
      ]
    });

    console.log(`📁 Phoenix-focused CSV data will be saved to: ${this.csvFilePath}`);
  }

  async startPhoenixFocusedScanning() {
    console.log('\n🔥 PHOENIX-FOCUSED ARBITRAGE SCANNER');
    console.log('═'.repeat(80));
    console.log('⚡ Specifically targeting Phoenix AMM & Phoenix CLMM');
    console.log('⏰ Respects rate limits while hunting for Phoenix arbitrage');
    console.log('📊 Enhanced detection for Phoenix protocol variants\n');

    this.isRunning = true;
    this.startTime = Date.now();

    // Pairs optimized for Phoenix protocol detection
    const tradingPairs = [
      // Major pairs likely to use Phoenix
      { from: 'SOL', to: 'USDC', amount: new Decimal(1) },
      { from: 'SOL', to: 'USDT', amount: new Decimal(1) },
      { from: 'USDC', to: 'SOL', amount: new Decimal(100) },
      { from: 'USDT', to: 'SOL', amount: new Decimal(100) },
      
      // Cross-token pairs that often route through Phoenix
      { from: 'RAY', to: 'SOL', amount: new Decimal(100) },
      { from: 'SOL', to: 'RAY', amount: new Decimal(1) },
      { from: 'ORCA', to: 'SOL', amount: new Decimal(100) },
      { from: 'SOL', to: 'ORCA', amount: new Decimal(1) },
      { from: 'JUP', to: 'SOL', amount: new Decimal(100) },
      { from: 'SOL', to: 'JUP', amount: new Decimal(1) },
      
      // Alternative stablecoin pairs
      { from: 'RAY', to: 'USDC', amount: new Decimal(100) },
      { from: 'ORCA', to: 'USDC', amount: new Decimal(100) },
      { from: 'JUP', to: 'USDC', amount: new Decimal(100) },
      
      // Inter-token pairs that may use Phoenix for routing
      { from: 'RAY', to: 'ORCA', amount: new Decimal(100) },
      { from: 'RAY', to: 'JUP', amount: new Decimal(100) },
      { from: 'ORCA', to: 'JUP', amount: new Decimal(100) },
      { from: 'JUP', to: 'RAY', amount: new Decimal(100) },
      { from: 'ORCA', to: 'RAY', amount: new Decimal(100) },
      { from: 'JUP', to: 'ORCA', amount: new Decimal(100) },
      
      // Meme tokens that might use Phoenix
      { from: 'BONK', to: 'SOL', amount: new Decimal(1000000) },
      { from: 'WIF', to: 'SOL', amount: new Decimal(100) },
      { from: 'SAMO', to: 'SOL', amount: new Decimal(1000) },
      { from: 'BONK', to: 'USDC', amount: new Decimal(1000000) },
      { from: 'WIF', to: 'USDC', amount: new Decimal(100) },
    ];

    console.log(`🎯 Scanning ${tradingPairs.length} Phoenix-optimized pairs`);
    console.log(`⏱️  Estimated time per cycle: ${Math.ceil(tradingPairs.length * 3 / 60)} minutes\n`);

    while (this.isRunning) {
      this.scanCounter++;
      console.log(`\n🔥 PHOENIX SCAN #${this.scanCounter}`);
      console.log('═'.repeat(80));

      const scanStartTime = Date.now();
      await this.runPhoenixScan(tradingPairs);
      const scanDuration = Date.now() - scanStartTime;

      const totalTime = Math.round((Date.now() - this.startTime) / 1000);
      const rps = this.requestCounter / Math.max(totalTime, 1);
      const phoenixPercentage = this.totalRecords > 0 ? (this.phoenixRecords / this.totalRecords * 100).toFixed(1) : '0';

      console.log(`\n✅ Phoenix Scan #${this.scanCounter} completed in ${Math.round(scanDuration/1000)}s`);
      console.log(`📊 Total records: ${this.totalRecords} | Phoenix records: ${this.phoenixRecords} (${phoenixPercentage}%)`);
      console.log(`📈 Request rate: ${rps.toFixed(2)} req/s | Total requests: ${this.requestCounter}`);

      // Stop after collecting substantial data or finding enough Phoenix examples
      if (this.totalRecords >= 200 || this.phoenixRecords >= 20 || this.scanCounter >= 3) {
        console.log(`\n🎉 PHOENIX SCAN COMPLETE!`);
        console.log(`🔥 Found ${this.phoenixRecords} Phoenix protocol records out of ${this.totalRecords} total`);
        break;
      }

      console.log(`⏳ Waiting 30 seconds before next Phoenix scan...`);
      await this.sleep(30000);
    }

    console.log(`\n📁 Final Phoenix CSV saved to: ${this.csvFilePath}`);
    console.log(`🔥 Phoenix protocol detection summary: ${this.phoenixRecords}/${this.totalRecords} records`);
  }

  private async runPhoenixScan(pairs: Array<{ from: string; to: string; amount: Decimal }>) {
    const scanStartTime = Date.now();
    const isoTimestamp = new Date().toISOString();
    let bestArbitrage: ArbitrageOpportunity | null = null;
    let bestPhoenixArbitrage: ArbitrageOpportunity | null = null;
    const allRecords: PriceDataRecord[] = [];

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      
      console.log(`🔍 [${i + 1}/${pairs.length}] ${pair.from}/${pair.to}`);
      
      try {
        await this.respectRateLimit();
        
        const dexPrices = await this.getPhoenixAwarePrices(pair.from, pair.to, pair.amount);
        
        if (dexPrices.length >= 2) {
          const phoenixCount = dexPrices.filter(dp => this.isPhoenixProtocol(dp.dex)).length;
          const opportunities = this.findArbitrageOpportunities(dexPrices, `${pair.from}/${pair.to}`);
          
          if (opportunities.length > 0) {
            const best = opportunities[0];
            const phoenixOpps = opportunities.filter(opp => 
              this.isPhoenixProtocol(opp.buyDex) || this.isPhoenixProtocol(opp.sellDex)
            );
            
            if (phoenixOpps.length > 0) {
              const bestPhoenix = phoenixOpps[0];
              console.log(`   🔥 Phoenix: ${bestPhoenix.profitPercentage.toFixed(4)}% (${bestPhoenix.buyDex} → ${bestPhoenix.sellDex})`);
              
              if (!bestPhoenixArbitrage || bestPhoenix.profitPercentage.gt(bestPhoenixArbitrage.profitPercentage)) {
                bestPhoenixArbitrage = bestPhoenix;
              }
            } else {
              console.log(`   💰 Best: ${best.profitPercentage.toFixed(4)}% (${best.buyDex} → ${best.sellDex}) [${phoenixCount} Phoenix DEXes]`);
            }
            
            if (!bestArbitrage || best.profitPercentage.gt(bestArbitrage.profitPercentage)) {
              bestArbitrage = best;
            }
          } else {
            console.log(`   ⚪ No arbitrage found [${phoenixCount} Phoenix, ${dexPrices.length} total DEXes]`);
          }

          // Convert to CSV records with Phoenix tracking
          const csvRecords = this.convertToPhoenixCsvRecords(
            dexPrices, 
            opportunities, 
            `${pair.from}/${pair.to}`, 
            isoTimestamp, 
            this.scanCounter,
            Date.now() - scanStartTime
          );
          allRecords.push(...csvRecords);
        } else {
          console.log(`   ❌ Insufficient DEX data (${dexPrices.length} DEXes found)`);
        }

      } catch (error) {
        if (error instanceof Error && error.message.includes('429')) {
          console.log(`   ⏸️  Rate limited - waiting 2 minutes...`);
          await this.sleep(120000);
        } else {
          console.log(`   ❌ Error: ${error instanceof Error ? error.message.slice(0, 50) : 'Unknown'}`);
        }
      }
    }

    // Mark best arbitrage opportunities
    if (bestArbitrage) {
      allRecords.forEach(record => {
        if (record.pair === bestArbitrage!.pair && 
            Math.abs(record.arbitrageProfitPercent - bestArbitrage!.profitPercentage.toNumber()) < 0.001) {
          record.bestArbitrageOfScan = true;
        }
      });
    }

    // Display results
    if (bestPhoenixArbitrage) {
      console.log(`\n🔥 BEST PHOENIX ARBITRAGE THIS SCAN:`);
      console.log(`💰 ${bestPhoenixArbitrage.pair}: ${bestPhoenixArbitrage.profitPercentage.toFixed(4)}%`);
      console.log(`🔄 ${bestPhoenixArbitrage.buyDex} @ ${bestPhoenixArbitrage.buyPrice.toFixed(8)} → ${bestPhoenixArbitrage.sellDex} @ ${bestPhoenixArbitrage.sellPrice.toFixed(8)}`);
    } else if (bestArbitrage) {
      console.log(`\n🏆 BEST ARBITRAGE THIS SCAN (Non-Phoenix):`);
      console.log(`💰 ${bestArbitrage.pair}: ${bestArbitrage.profitPercentage.toFixed(4)}%`);
      console.log(`🔄 ${bestArbitrage.buyDex} @ ${bestArbitrage.buyPrice.toFixed(8)} → ${bestArbitrage.sellDex} @ ${bestArbitrage.sellPrice.toFixed(8)}`);
    }

    // Count Phoenix records
    const newPhoenixRecords = allRecords.filter(record => record.phoenixProtocol !== 'None').length;
    this.phoenixRecords += newPhoenixRecords;

    // Write all data to CSV
    if (allRecords.length > 0) {
      await this.writeDataToCSV(allRecords);
      this.totalRecords += allRecords.length;
      console.log(`💾 Wrote ${allRecords.length} records (${newPhoenixRecords} Phoenix) to CSV`);
    }
  }

  private async respectRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < 2500) { // 2.5 seconds to be extra safe
      const waitTime = 2500 - timeSinceLastRequest;
      await this.sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
    this.requestCounter++;
  }

  async getPhoenixAwarePrices(fromSymbol: string, toSymbol: string, amount: Decimal): Promise<DexPrice[]> {
    const fromToken = getTokenBySymbol(fromSymbol);
    const toToken = getTokenBySymbol(toSymbol);

    if (!fromToken || !toToken) {
      throw new Error(`Unknown token: ${fromSymbol} or ${toSymbol}`);
    }

    const dexPrices: DexPrice[] = [];
    const seenDexes = new Set<string>();

    // Multiple requests optimized for Phoenix detection
    const quoteParams = [
      { slippage: 50, onlyDirect: false },   // 0.5% - conservative
      { slippage: 100, onlyDirect: false },  // 1% - standard
      { slippage: 300, onlyDirect: false },  // 3% - aggressive (may show more exotic routes)
      { slippage: 150, onlyDirect: true },   // 1.5% direct only
    ];

    for (const params of quoteParams) {
      try {
        await this.respectRateLimit();
        
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
            const dexName = this.extractPhoenixAwareDexName(dexLabel);
            
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
              
              // Log Phoenix detections
              if (this.isPhoenixProtocol(dexName)) {
                console.log(`     🔥 Phoenix detected: ${dexName} (${dexLabel})`);
              }
            }
          }
        }

      } catch (error) {
        if (error instanceof Error && error.message.includes('429')) {
          console.log(`     ⏸️  Rate limited on quote ${params.slippage}bps - continuing...`);
          continue;
        }
      }
    }

    return dexPrices;
  }

  private extractPhoenixAwareDexName(label: string): string {
    if (!label) return 'Unknown';
    
    const lowerLabel = label.toLowerCase();
    
    // Enhanced Phoenix detection
    if (lowerLabel.includes('phoenix clmm') || lowerLabel.includes('phoenix-clmm') || lowerLabel.includes('phoenixclmm')) return 'Phoenix CLMM';
    if (lowerLabel.includes('phoenix amm') || lowerLabel.includes('phoenix-amm') || lowerLabel.includes('phoenixamm')) return 'Phoenix AMM';
    if (lowerLabel.includes('phoenix v1') || lowerLabel.includes('phoenix-v1')) return 'Phoenix AMM';
    if (lowerLabel.includes('phoenix v2') || lowerLabel.includes('phoenix-v2')) return 'Phoenix CLMM';
    if (lowerLabel.includes('phoenix')) return 'Phoenix';
    
    // Standard DEX detection
    if (lowerLabel.includes('raydium clmm') || lowerLabel.includes('raydium-clmm')) return 'Raydium CLMM';
    if (lowerLabel.includes('raydium')) return 'Raydium';
    if (lowerLabel.includes('orca whirlpool') || lowerLabel.includes('whirlpool')) return 'Orca-Whirlpool';
    if (lowerLabel.includes('orca')) return 'Orca';
    if (lowerLabel.includes('meteora dlmm') || lowerLabel.includes('meteora-dlmm')) return 'Meteora DLMM';
    if (lowerLabel.includes('meteora')) return 'Meteora';
    if (lowerLabel.includes('openbook')) return 'OpenBook';
    if (lowerLabel.includes('lifinity')) return 'Lifinity';
    if (lowerLabel.includes('solfi')) return 'SolFi';
    if (lowerLabel.includes('zerofi')) return 'ZeroFi';
    if (lowerLabel.includes('obric')) return 'Obric V2';
    if (lowerLabel.includes('stabble')) return 'Stabble';
    if (lowerLabel.includes('saros')) return 'Saros';
    if (lowerLabel.includes('bonkswap')) return 'Bonkswap';
    
    if (lowerLabel.length > 2 && !lowerLabel.includes('unknown')) {
      return label;
    }
    
    return 'Unknown';
  }

  private isPhoenixProtocol(dexName: string): boolean {
    const lowerName = dexName.toLowerCase();
    return lowerName.includes('phoenix');
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

  private convertToPhoenixCsvRecords(
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
        requestId: `${scanNumber}-${pair}-${dexPrice.dex}`,
        phoenixProtocol: this.isPhoenixProtocol(dexPrice.dex) ? dexPrice.dex : 'None'
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
    console.log('\n🛑 Phoenix-focused scanner stopped');
    console.log(`📁 Final data saved to: ${this.csvFilePath}`);
    console.log(`🔥 Phoenix records: ${this.phoenixRecords}/${this.totalRecords} total`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Handle graceful shutdown
const scanner = new PhoenixFocusedScanner();

process.on('SIGINT', () => {
  console.log('\n\n🛑 Received interrupt signal...');
  scanner.stop();
  process.exit(0);
});

// Start the Phoenix-focused scanner
scanner.startPhoenixFocusedScanning().catch(error => {
  console.error('💥 Phoenix-focused scanner failed:', error.message);
  process.exit(1);
}); 