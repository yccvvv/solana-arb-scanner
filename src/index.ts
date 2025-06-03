import 'dotenv/config';
import { ArbitrageScanner } from './scanner/ArbitrageScanner';
import { defaultConfig } from './config/config';
import { ScannerEvent } from './types';

// ASCII Art Banner
const banner = `
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ███████╗ ██████╗ ██╗      █████╗ ███╗   ██╗ █████╗       │
│   ██╔════╝██╔═══██╗██║     ██╔══██╗████╗  ██║██╔══██╗      │
│   ███████╗██║   ██║██║     ███████║██╔██╗ ██║███████║      │
│   ╚════██║██║   ██║██║     ██╔══██║██║╚██╗██║██╔══██║      │
│   ███████║╚██████╔╝███████╗██║  ██║██║ ╚████║██║  ██║      │
│   ╚══════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝      │
│                                                             │
│              ARBITRAGE SCANNER v1.0.0                      │
│          Multi-DEX Arbitrage Opportunity Scanner           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
`;

class SolanaArbitrageApp {
  private scanner: ArbitrageScanner;
  private startTime: number;

  constructor() {
    console.log(banner);
    
    this.startTime = Date.now();
    this.scanner = new ArbitrageScanner(defaultConfig);
    this.setupEventHandlers();
    this.setupGracefulShutdown();
  }

  /**
   * Setup event handlers for the scanner
   */
  private setupEventHandlers(): void {
    // Handle arbitrage opportunities
    this.scanner.on('opportunity_found', (eventData) => {
      const opportunity = eventData.data;
      console.log('\n' + '='.repeat(60));
      console.log('🎯 NEW ARBITRAGE OPPORTUNITY DETECTED');
      console.log('='.repeat(60));
      console.log(`📅 Time: ${new Date().toLocaleString()}`);
      console.log(`💰 Pair: ${opportunity.tokenA.symbol}/${opportunity.tokenB.symbol}`);
      console.log(`📈 Buy Price: ${opportunity.buyPrice.toFixed(8)} (${opportunity.buyDex})`);
      console.log(`📉 Sell Price: ${opportunity.sellPrice.toFixed(8)} (${opportunity.sellDex})`);
      console.log(`💵 Profit: ${opportunity.profitPercentage.toFixed(2)}%`);
      console.log(`🎲 Confidence: ${(opportunity.confidence * 100).toFixed(1)}%`);
      console.log(`🆔 ID: ${opportunity.id}`);
      console.log('='.repeat(60) + '\n');
    });

    // Handle price updates
    this.scanner.on('price_update', (eventData) => {
      const priceData = eventData.data;
      console.log(`💱 Price Update: ${priceData.tokenA.symbol}/${priceData.tokenB.symbol} = ${priceData.price.toFixed(8)} on ${priceData.dex}`);
    });

    // Handle status updates
    this.scanner.on('status_update', (eventData) => {
      const { status, metrics } = eventData.data;
      console.log(`📊 Scanner Status: ${status.toUpperCase()}`);
      
      if (metrics) {
        console.log(`   Total Scans: ${metrics.totalScans}`);
        console.log(`   Opportunities Found: ${metrics.opportunitiesFound}`);
        console.log(`   Average Profit: ${metrics.averageProfitPercentage.toFixed(2)}%`);
        
        if (metrics.topOpportunity) {
          console.log(`   Best Opportunity: ${metrics.topOpportunity.profitPercentage.toFixed(2)}% (${metrics.topOpportunity.tokenA.symbol}/${metrics.topOpportunity.tokenB.symbol})`);
        }
      }
    });

    // Handle errors
    this.scanner.on('error', (eventData) => {
      console.error(`❌ Scanner Error: ${eventData.data.error}`);
    });
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      this.stop();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      this.stop();
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      this.stop();
      process.exit(1);
    });
  }

  /**
   * Start the application
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Initializing Solana Arbitrage Scanner...');
      console.log(`📡 RPC Endpoint: ${defaultConfig.rpcEndpoint}`);
      console.log(`🔄 Scan Interval: ${defaultConfig.priceUpdateInterval}ms`);
      console.log(`💰 Min Profit Threshold: ${defaultConfig.minProfitThreshold}%`);
      console.log(`🎯 Monitored Pairs: ${defaultConfig.monitoredPairs.join(', ')}`);
      console.log('\n' + '─'.repeat(60));

      await this.scanner.start();

      // Display running status
      setInterval(() => {
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        const metrics = this.scanner.getMetrics();
        
        console.log(`\n📈 Scanner Running - Uptime: ${uptime}s | Scans: ${metrics.totalScans} | Opportunities: ${metrics.opportunitiesFound}`);
      }, 30000); // Every 30 seconds

    } catch (error) {
      console.error('💥 Failed to start scanner:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the application
   */
  stop(): void {
    console.log('⏹️  Stopping scanner...');
    this.scanner.stop();
    
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const metrics = this.scanner.getMetrics();
    
    console.log('\n📊 Final Statistics:');
    console.log(`   Uptime: ${uptime} seconds`);
    console.log(`   Total Scans: ${metrics.totalScans}`);
    console.log(`   Opportunities Found: ${metrics.opportunitiesFound}`);
    console.log(`   Average Profit: ${metrics.averageProfitPercentage.toFixed(2)}%`);
    
    if (metrics.topOpportunity) {
      console.log(`   Best Opportunity: ${metrics.topOpportunity.profitPercentage.toFixed(2)}% (${metrics.topOpportunity.tokenA.symbol}/${metrics.topOpportunity.tokenB.symbol})`);
    }
    
    console.log('\n👋 Scanner stopped. Goodbye!');
    process.exit(0);
  }
}

// Create and start the application
const app = new SolanaArbitrageApp();

// Start the scanner
app.start().catch((error) => {
  console.error('💥 Application failed to start:', error);
  process.exit(1);
}); 