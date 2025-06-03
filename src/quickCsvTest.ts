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
}

class QuickCsvTest {
  private jupiterClient: JupiterClient;
  private priceDataWriter: any;
  private csvFilePath: string = '';

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
    this.csvFilePath = path.join(dataDir, `quick_arbitrage_test_${timestamp}.csv`);

    this.priceDataWriter = createCsvWriter.createObjectCsvWriter({
      path: this.csvFilePath,
      header: [
        { id: 'timestamp', title: 'Timestamp' },
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
        { id: 'bestArbitrageOfScan', title: 'Best Arbitrage of Scan' }
      ]
    });

    console.log(`📁 CSV data will be saved to: ${this.csvFilePath}`);
  }

  async runTest() {
    console.log('\n🚀 QUICK CSV TEST - SCANNING FEW PAIRS');
    console.log('='.repeat(60));

    const timestamp = new Date().toLocaleString();
    const isoTimestamp = new Date().toISOString();
    console.log(`🕐 ${timestamp}`);

    // Test with just a few pairs that we know work
    const pairs = [
      { from: 'SOL', to: 'USDT', amount: new Decimal(1) },
      { from: 'ORCA', to: 'SOL', amount: new Decimal(100) },
      { from: 'JUP', to: 'SOL', amount: new Decimal(100) },
      { from: 'BONK', to: 'SOL', amount: new Decimal(1000000) },
      { from: 'WIF', to: 'SOL', amount: new Decimal(100) },
    ];

    const allPriceData: PriceDataRecord[] = [];
    let bestArbitrage: ArbitrageOpportunity | null = null;

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      console.log(`\n📊 [${i + 1}/${pairs.length}] Scanning ${pair.from}/${pair.to}:`);
      console.log('─'.repeat(50));

      try {
        const dexPrices = await this.getPricesFromAllDexes(pair.from, pair.to, pair.amount);
        
        if (dexPrices.length >= 2) {
          const opportunities = this.findArbitrageOpportunities(dexPrices, `${pair.from}/${pair.to}`);
          this.displayResults(dexPrices, opportunities);

          // Track best arbitrage
          if (opportunities.length > 0 && (!bestArbitrage || opportunities[0].profitPercentage.gt(bestArbitrage.profitPercentage))) {
            bestArbitrage = opportunities[0];
          }

          // Convert to CSV records
          const csvRecords = this.convertToCsvRecords(dexPrices, opportunities, `${pair.from}/${pair.to}`, isoTimestamp);
          allPriceData.push(...csvRecords);
        } else {
          console.log('❌ Insufficient price data from DEXes');
        }

        // Delay to avoid rate limiting
        await this.sleep(2000);

      } catch (error) {
        console.log(`❌ Error scanning ${pair.from}/${pair.to}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Mark best arbitrage
    if (bestArbitrage) {
      allPriceData.forEach(record => {
        if (record.pair === bestArbitrage!.pair && 
            record.arbitrageProfitPercent === bestArbitrage!.profitPercentage.toNumber()) {
          record.bestArbitrageOfScan = true;
        }
      });
      
      console.log(`\n🏆 BEST ARBITRAGE FOUND:`);
      console.log(`💰 ${bestArbitrage.pair}: Buy ${bestArbitrage.buyDex} @ ${bestArbitrage.buyPrice.toFixed(6)} → Sell ${bestArbitrage.sellDex} @ ${bestArbitrage.sellPrice.toFixed(6)}`);
      console.log(`📈 Profit: ${bestArbitrage.profitPercentage.toFixed(3)}% (${bestArbitrage.profit.toFixed(8)})`);
    }

    // Write data to CSV
    if (allPriceData.length > 0) {
      await this.writeDataToCSV(allPriceData);
      console.log(`\n💾 SUCCESS! Wrote ${allPriceData.length} records to CSV file`);
      console.log(`📁 CSV File: ${this.csvFilePath}`);
    } else {
      console.log(`\n❌ No data to write to CSV`);
    }

    console.log(`\n✅ Quick test completed!`);
  }

  async getPricesFromAllDexes(fromSymbol: string, toSymbol: string, amount: Decimal): Promise<DexPrice[]> {
    const fromToken = getTokenBySymbol(fromSymbol);
    const toToken = getTokenBySymbol(toSymbol);

    if (!fromToken || !toToken) {
      throw new Error(`Unknown token: ${fromSymbol} or ${toSymbol}`);
    }

    const dexPrices: DexPrice[] = [];
    const seenDexes = new Set<string>();

    // Fewer quote requests to avoid rate limiting
    const quoteRequests = [
      { slippage: 50, onlyDirect: false },
      { slippage: 100, onlyDirect: true },
      { slippage: 200, onlyDirect: false },
    ];

    for (const request of quoteRequests) {
      try {
        const quote = await this.jupiterClient.getQuote(
          fromToken.mint.toString(),
          toToken.mint.toString(),
          amount,
          fromToken.decimals,
          request.slippage
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

        await this.sleep(800);

      } catch (error) {
        continue;
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
    if (lowerLabel.includes('phoenix')) return 'Phoenix';
    if (lowerLabel.includes('openbook')) return 'OpenBook';
    if (lowerLabel.includes('whirlpool')) return 'Orca-Whirlpool';
    if (lowerLabel.includes('lifinity')) return 'Lifinity';
    if (lowerLabel.includes('solfi')) return 'SolFi';
    if (lowerLabel.includes('zerofi')) return 'ZeroFi';
    if (lowerLabel.includes('obric')) return 'Obric V2';
    
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
    timestamp: string
  ): PriceDataRecord[] {
    const records: PriceDataRecord[] = [];

    dexPrices.forEach(dexPrice => {
      // Find if this DEX is involved in any arbitrage
      const arbitrageOpp = opportunities.find(opp => 
        opp.buyDex === dexPrice.dex || opp.sellDex === dexPrice.dex
      );

      records.push({
        timestamp,
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
        bestArbitrageOfScan: false // Will be set later
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

  private displayResults(dexPrices: DexPrice[], opportunities: ArbitrageOpportunity[]) {
    dexPrices.forEach(dexPrice => {
      const impact = dexPrice.priceImpact.toFixed(2);
      console.log(`📈 ${dexPrice.dex.padEnd(15)}: ${dexPrice.price.toFixed(8)} (Impact: ${impact}%)`);
    });

    if (opportunities.length > 0) {
      console.log('\n🚀 ARBITRAGE OPPORTUNITIES:');
      opportunities.forEach((opp, index) => {
        if (opp.profitPercentage.gte(0.02)) {
          console.log(`${index + 1}. 💰 Buy ${opp.buyDex} @ ${opp.buyPrice.toFixed(8)} → Sell ${opp.sellDex} @ ${opp.sellPrice.toFixed(8)}`);
          console.log(`   📊 Profit: ${opp.profitPercentage.toFixed(4)}% (${opp.profit.toFixed(8)})`);
        }
      });
    } else {
      console.log('⚪ No arbitrage opportunities found');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the quick test
const quickTest = new QuickCsvTest();
quickTest.runTest().catch(error => {
  console.error('💥 Quick test failed:', error.message);
  process.exit(1);
}); 