import 'dotenv/config';
import { JupiterClient } from './utils/jupiterClient';
import { getTokenBySymbol } from './utils/tokenUtils';
import Decimal from 'decimal.js';

// Simple price display test
class PriceDisplayTest {
  private jupiterClient: JupiterClient;
  private isRunning: boolean = false;

  constructor() {
    this.jupiterClient = new JupiterClient();
  }

  async start() {
    console.log('\n🚀 REAL-TIME PRICE DISPLAY TEST');
    console.log('='.repeat(50));
    console.log('📊 Fetching live token prices from Jupiter API...\n');

    this.isRunning = true;

    // Skip health check and try direct price fetching
    console.log('🌐 Testing Jupiter API connection...\n');

    // Start the price display loop
    while (this.isRunning) {
      await this.displayCurrentPrices();
      await this.sleep(10000); // Wait 10 seconds between updates
    }
  }

  async displayCurrentPrices() {
    const timestamp = new Date().toLocaleString();
    console.log(`\n⏰ ${timestamp}`);
    console.log('─'.repeat(60));

    // Token pairs to display
    const pairs = [
      { from: 'SOL', to: 'USDC', amount: new Decimal(1) },
      { from: 'SOL', to: 'USDT', amount: new Decimal(1) },
      { from: 'RAY', to: 'SOL', amount: new Decimal(100) },
      { from: 'ORCA', to: 'SOL', amount: new Decimal(100) },
      { from: 'JUP', to: 'SOL', amount: new Decimal(100) }
    ];

    for (const pair of pairs) {
      try {
        const fromToken = getTokenBySymbol(pair.from);
        const toToken = getTokenBySymbol(pair.to);

        if (!fromToken || !toToken) {
          console.log(`❌ ${pair.from}/${pair.to}: Unknown token`);
          continue;
        }

        // Get quote from Jupiter
        const quote = await this.jupiterClient.getQuote(
          fromToken.mint.toString(),
          toToken.mint.toString(),
          pair.amount,
          fromToken.decimals,
          50 // 0.5% slippage
        );

        if (quote) {
          const outputAmount = new Decimal(quote.outAmount).div(
            new Decimal(10).pow(toToken.decimals)
          );
          const price = outputAmount.div(pair.amount);
          
          // Calculate price impact
          const priceImpact = new Decimal(quote.priceImpactPct || 0);
          
          console.log(`💰 ${pair.from}/${pair.to}: ${price.toFixed(6)} ${toToken.symbol} per ${fromToken.symbol} (Impact: ${priceImpact.toFixed(2)}%)`);
        } else {
          console.log(`⚠️  ${pair.from}/${pair.to}: No quote available`);
        }

        // Small delay between requests to be API-friendly
        await this.sleep(1000);

      } catch (error) {
        if ((error as any).response?.status === 429) {
          console.log(`⏸️  ${pair.from}/${pair.to}: Rate limited (this is normal)`);
        } else {
          console.log(`❌ ${pair.from}/${pair.to}: Error fetching price`);
        }
      }
    }

    console.log('─'.repeat(60));
    console.log('💡 Tip: Press Ctrl+C to stop the price display');
  }

  stop() {
    this.isRunning = false;
    console.log('\n🛑 Price display stopped');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Handle graceful shutdown
const priceTest = new PriceDisplayTest();

process.on('SIGINT', () => {
  console.log('\n\n🛑 Received interrupt signal...');
  priceTest.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received terminate signal...');
  priceTest.stop();
  process.exit(0);
});

// Start the price display
priceTest.start().catch(error => {
  console.error('💥 Price display failed:', error.message);
  process.exit(1);
}); 