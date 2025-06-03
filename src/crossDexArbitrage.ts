import 'dotenv/config';
import { JupiterClient } from './utils/jupiterClient';
import { getTokenBySymbol } from './utils/tokenUtils';
import Decimal from 'decimal.js';

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

class CrossDexArbitrageScanner {
  private jupiterClient: JupiterClient;
  private isRunning: boolean = false;
  private targetDexes = ['Raydium', 'Orca', 'Meteora', 'Phoenix', 'Aldrin'];

  constructor() {
    this.jupiterClient = new JupiterClient();
  }

  async start() {
    console.log('\n🔍 CROSS-DEX ARBITRAGE SCANNER');
    console.log('='.repeat(60));
    console.log('🎯 Comparing prices across: Raydium, Orca, Meteora, Phoenix AMM, Phoenix CLMM');
    console.log('💰 Scanning for arbitrage opportunities...\n');

    this.isRunning = true;

    while (this.isRunning) {
      await this.scanForArbitrageOpportunities();
      await this.sleep(8000); // 8 seconds between scans
    }
  }

  async scanForArbitrageOpportunities() {
    const timestamp = new Date().toLocaleString();
    console.log(`\n🕐 ${timestamp}`);
    console.log('═'.repeat(80));

    // Token pairs to scan
    const pairs = [
      { from: 'SOL', to: 'USDC', amount: new Decimal(1) },
      { from: 'SOL', to: 'USDT', amount: new Decimal(1) },
      { from: 'RAY', to: 'SOL', amount: new Decimal(100) },
      { from: 'ORCA', to: 'SOL', amount: new Decimal(100) },
      { from: 'JUP', to: 'SOL', amount: new Decimal(100) }
    ];

    for (const pair of pairs) {
      console.log(`\n📊 Scanning ${pair.from}/${pair.to}:`);
      console.log('─'.repeat(50));

      try {
        const dexPrices = await this.getPricesFromAllDexes(pair.from, pair.to, pair.amount);
        
        if (dexPrices.length >= 2) {
          const opportunities = this.findArbitrageOpportunities(dexPrices, `${pair.from}/${pair.to}`);
          this.displayResults(dexPrices, opportunities);
        } else {
          console.log('❌ Insufficient price data from DEXes');
        }

        // Delay between pairs
        await this.sleep(1000);

      } catch (error) {
        console.log(`❌ Error scanning ${pair.from}/${pair.to}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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

    // Get multiple quotes with different parameters to potentially hit different DEXes
    const quoteRequests = [
      { slippage: 50, onlyDirect: false },   // General aggregated
      { slippage: 100, onlyDirect: true },   // Direct routes only
      { slippage: 50, onlyDirect: true },    // Direct routes with lower slippage
      { slippage: 200, onlyDirect: false },  // Higher slippage for more options
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
          // Extract DEX information from route
          for (const routePlan of quote.routePlan) {
            const dexLabel = routePlan.swapInfo.label;
            const dexName = this.extractDexName(dexLabel);
            
            // Debug: Show all DEX labels we're seeing
            console.log(`🔍 Found route: ${dexLabel} → Extracted: ${dexName}`);
            
            // Be less restrictive - include more DEXes
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

        // Small delay between requests
        await this.sleep(500);

      } catch (error) {
        console.log(`⚠️ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        continue;
      }
    }

    return dexPrices;
  }

  private extractDexName(label: string): string {
    if (!label) return 'Unknown';
    
    const lowerLabel = label.toLowerCase();
    
    // More comprehensive DEX detection
    if (lowerLabel.includes('raydium')) return 'Raydium';
    if (lowerLabel.includes('orca')) return 'Orca';
    if (lowerLabel.includes('meteora')) return 'Meteora';
    if (lowerLabel.includes('phoenix')) return 'Phoenix';
    if (lowerLabel.includes('aldrin')) return 'Aldrin';
    if (lowerLabel.includes('saber')) return 'Saber';
    if (lowerLabel.includes('mercurial')) return 'Mercurial';
    if (lowerLabel.includes('serum')) return 'Serum';
    if (lowerLabel.includes('openbook')) return 'OpenBook';
    if (lowerLabel.includes('whirlpool')) return 'Orca-Whirlpool';
    if (lowerLabel.includes('lifinity')) return 'Lifinity';
    if (lowerLabel.includes('cropper')) return 'Cropper';
    if (lowerLabel.includes('stepn')) return 'StepN';
    
    // If it's a recognized DEX format but not in our list, include it anyway
    if (lowerLabel.length > 2 && !lowerLabel.includes('unknown')) {
      return label; // Return the original label
    }
    
    return 'Unknown';
  }

  private isTargetDex(dexName: string): boolean {
    // Remove this restrictive filtering - include all valid DEXes
    return dexName !== 'Unknown' && dexName.length > 0;
  }

  private findArbitrageOpportunities(dexPrices: DexPrice[], pair: string): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    // Compare all DEX combinations
    for (let i = 0; i < dexPrices.length; i++) {
      for (let j = i + 1; j < dexPrices.length; j++) {
        const dex1 = dexPrices[i];
        const dex2 = dexPrices[j];

        // Calculate arbitrage in both directions
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

    // Sort by profit percentage (highest first)
    return opportunities.sort((a, b) => b.profitPercentage.sub(a.profitPercentage).toNumber());
  }

  private displayResults(dexPrices: DexPrice[], opportunities: ArbitrageOpportunity[]) {
    // Display prices from each DEX
    dexPrices.forEach(dexPrice => {
      const impact = dexPrice.priceImpact.toFixed(2);
      console.log(`📈 ${dexPrice.dex.padEnd(12)}: ${dexPrice.price.toFixed(6)} (Impact: ${impact}%)`);
    });

    // Display arbitrage opportunities
    if (opportunities.length > 0) {
      console.log('\n🚀 ARBITRAGE OPPORTUNITIES:');
      opportunities.forEach((opp, index) => {
        if (opp.profitPercentage.gte(0.05)) { // Only show opportunities > 0.05%
          console.log(`${index + 1}. 💰 Buy on ${opp.buyDex} @ ${opp.buyPrice.toFixed(6)} → Sell on ${opp.sellDex} @ ${opp.sellPrice.toFixed(6)}`);
          console.log(`   📊 Profit: ${opp.profitPercentage.toFixed(3)}% (${opp.profit.toFixed(6)})`);
        }
      });
    } else {
      console.log('⚪ No significant arbitrage opportunities found');
    }
  }

  stop() {
    this.isRunning = false;
    console.log('\n🛑 Cross-DEX arbitrage scanner stopped');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Handle graceful shutdown
const scanner = new CrossDexArbitrageScanner();

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

// Start the cross-DEX arbitrage scanner
scanner.start().catch(error => {
  console.error('💥 Cross-DEX scanner failed:', error.message);
  process.exit(1);
}); 