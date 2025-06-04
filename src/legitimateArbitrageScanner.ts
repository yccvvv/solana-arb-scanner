import 'dotenv/config';
import { Connection, PublicKey } from '@solana/web3.js';
import { JupiterClient } from './utils/jupiterClient';
import { getTokenBySymbol } from './utils/tokenUtils';
import Decimal from 'decimal.js';
import * as path from 'path';
import axios from 'axios';

// Use require for csv-writer to avoid ES module issues
const createCsvWriter = require('csv-writer');

interface DirectDexPrice {
  dex: string;
  price: Decimal;
  outputAmount: Decimal;
  inputAmount: Decimal;
  priceImpact: Decimal;
  liquidityAvailable: boolean;
  source: 'direct' | 'aggregator';
}

interface ArbitrageOpportunity {
  pair: string;
  directDex: string;
  aggregatorPrice: Decimal;
  directDexPrice: Decimal;
  profit: Decimal;
  profitPercentage: Decimal;
  timestamp: string;
  estimatedGasCost: Decimal;
  netProfitAfterGas: Decimal;
  strategy: 'jupiter_vs_direct' | 'direct_vs_direct';
  confidence: 'high' | 'medium' | 'low';
}

interface ArbitrageRecord {
  timestamp: string;
  scanNumber: number;
  tradingPair: string;
  dexName: string;
  source: string;
  price: number;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  liquidityAvailable: boolean;
  hasArbitrage: boolean;
  arbitrageStrategy: string;
  arbitrageProfitPercent: number;
  arbitrageProfitAmount: number;
  estimatedGasCost: number;
  netProfitAfterGas: number;
  confidence: string;
  scanDurationMs: number;
  requestId: string;
}

class LegitimateArbitrageScanner {
  private connection: Connection;
  private jupiterClient: JupiterClient;
  private csvWriter: any;
  private csvFilePath: string = '';
  private scanCounter: number = 0;
  private totalRecords: number = 0;
  private requestCounter: number = 0;
  private readonly ESTIMATED_GAS_COST = new Decimal(0.005); // 0.005 SOL for arbitrage execution
  private readonly MIN_PROFIT_THRESHOLD = new Decimal(0.001); // 0.1% minimum profit

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    this.jupiterClient = new JupiterClient();
    this.setupCSVWriter();
  }

  private setupCSVWriter() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!require('fs').existsSync(dataDir)) {
      require('fs').mkdirSync(dataDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.csvFilePath = path.join(dataDir, `legitimate_arbitrage_${timestamp}.csv`);

    this.csvWriter = createCsvWriter.createObjectCsvWriter({
      path: this.csvFilePath,
      header: [
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'scanNumber', title: 'Scan Number' },
        { id: 'tradingPair', title: 'Trading Pair' },
        { id: 'dexName', title: 'DEX Name' },
        { id: 'source', title: 'Data Source' },
        { id: 'price', title: 'Exchange Rate' },
        { id: 'inputAmount', title: 'Input Amount' },
        { id: 'outputAmount', title: 'Output Amount' },
        { id: 'priceImpact', title: 'Price Impact (%)' },
        { id: 'liquidityAvailable', title: 'Liquidity Available' },
        { id: 'hasArbitrage', title: 'Arbitrage Available' },
        { id: 'arbitrageStrategy', title: 'Arbitrage Strategy' },
        { id: 'arbitrageProfitPercent', title: 'Profit (%)' },
        { id: 'arbitrageProfitAmount', title: 'Profit Amount' },
        { id: 'estimatedGasCost', title: 'Gas Cost (SOL)' },
        { id: 'netProfitAfterGas', title: 'Net Profit' },
        { id: 'confidence', title: 'Confidence Level' },
        { id: 'scanDurationMs', title: 'Scan Duration (ms)' },
        { id: 'requestId', title: 'Request ID' }
      ]
    });

    console.log('✅ Legitimate Arbitrage Scanner initialized');
    console.log('📁 CSV output:', this.csvFilePath);
  }

  async startLegitimateScanning() {
    console.log('\n🚀 === LEGITIMATE ARBITRAGE SCANNER ===');
    console.log('🎯 Purpose: Real arbitrage detection using direct DEX integrations');
    console.log('🔧 Method: Jupiter Aggregator vs Direct DEX Price Comparison');
    console.log('📊 Data: 100% authentic, no synthetic routing interpretation');
    console.log('');
    console.log('⚠️  IMPORTANT LIMITATIONS:');
    console.log('   • Jupiter already optimizes routes across DEXes');
    console.log('   • Real arbitrage opportunities are rare in efficient markets');
    console.log('   • Price differences often reflect timing/API response delays');
    console.log('   • Direct DEX APIs may require authentication/wallets');
    console.log('   • Most "opportunities" disappear faster than execution time');
    console.log('');
    console.log('💡 Educational Value: Demonstrates proper arbitrage detection methodology');
    console.log('🚫 Production Warning: Requires significant additional development for real trading');
    console.log('='.repeat(80));

    const tradingPairs = [
      // Major liquid pairs for reliable arbitrage
      { from: 'SOL', to: 'USDC', amount: new Decimal(1), category: 'Major' },
      { from: 'SOL', to: 'USDT', amount: new Decimal(1), category: 'Major' },
      { from: 'RAY', to: 'SOL', amount: new Decimal(100), category: 'DeFi' },
      { from: 'RAY', to: 'USDC', amount: new Decimal(100), category: 'DeFi' },
      { from: 'ORCA', to: 'SOL', amount: new Decimal(100), category: 'DeFi' },
      { from: 'JUP', to: 'SOL', amount: new Decimal(100), category: 'DeFi' },
    ];

    console.log(`📈 Monitoring ${tradingPairs.length} high-liquidity trading pairs`);
    console.log(`⏱️  Scan frequency: Every 2 minutes`);
    console.log('🎯 Target: Detect real arbitrage between Jupiter aggregator and direct DEX prices\n');

    while (true) {
      this.scanCounter++;
      
      console.log(`\n🔍 SCAN CYCLE ${this.scanCounter}`);
      console.log('-'.repeat(60));
      console.log(`🕒 Start time: ${new Date().toISOString()}`);

      const scanStartTime = Date.now();
      await this.executeLegitimateArbitrageScan(tradingPairs);
      const scanDuration = Date.now() - scanStartTime;

      console.log(`✅ Scan completed in ${Math.round(scanDuration / 1000)}s`);
      console.log(`📊 Total records: ${this.totalRecords}`);

      // Wait 2 minutes between scans to respect API limits
      console.log('⏳ Waiting 2 minutes before next scan...');
      await this.sleep(120000);
    }
  }

  private async executeLegitimateArbitrageScan(pairs: Array<{ from: string; to: string; amount: Decimal; category: string }>) {
    const scanStartTime = Date.now();
    const isoTimestamp = new Date().toISOString();
    const allRecords: ArbitrageRecord[] = [];
    let opportunitiesFound = 0;

    for (const pair of pairs) {
      console.log(`🔄 Analyzing ${pair.from}/${pair.to} (${pair.category})`);
      
      try {
        // 1. Get Jupiter aggregated price
        const jupiterPrice = await this.getJupiterPrice(pair.from, pair.to, pair.amount);
        
        // 2. Get direct DEX prices
        const directPrices = await this.getDirectDexPrices(pair.from, pair.to, pair.amount);
        
        // 3. Compare prices and find arbitrage opportunities
        const opportunities = this.findLegitimateArbitrageOpportunities(
          jupiterPrice,
          directPrices,
          `${pair.from}/${pair.to}`
        );

        if (opportunities.length > 0) {
          opportunitiesFound += opportunities.length;
          const bestOpp = opportunities[0];
          console.log(`  ✅ ${opportunities.length} arbitrage opportunity(ies) found!`);
          console.log(`  🎯 Best: ${bestOpp.profitPercentage.mul(100).toFixed(4)}% profit`);
          console.log(`  💰 Strategy: ${bestOpp.strategy}`);
          console.log(`  💵 Net profit: ${bestOpp.netProfitAfterGas.toFixed(6)} tokens`);
        } else {
          console.log(`  ❌ No arbitrage opportunities detected`);
        }

        // Convert to CSV records
        const records = this.convertToLegitimateRecords(
          jupiterPrice,
          directPrices,
          opportunities,
          `${pair.from}/${pair.to}`,
          isoTimestamp,
          this.scanCounter,
          Date.now() - scanStartTime
        );

        allRecords.push(...records);

        // Rate limiting between pairs
        await this.sleep(3000);

      } catch (error) {
        console.log(`  ⚠️  Error analyzing ${pair.from}/${pair.to}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Write all records to CSV
    if (allRecords.length > 0) {
      await this.writeDataToCSV(allRecords);
      this.totalRecords += allRecords.length;
    }

    console.log(`\n📊 SCAN RESULTS:`);
    console.log(`  🎯 Arbitrage opportunities: ${opportunitiesFound}`);
    console.log(`  📝 Records generated: ${allRecords.length}`);
    console.log(`  ⏱️  Scan duration: ${Math.round((Date.now() - scanStartTime) / 1000)}s`);
  }

  private async getJupiterPrice(fromSymbol: string, toSymbol: string, amount: Decimal): Promise<DirectDexPrice | null> {
    const fromToken = getTokenBySymbol(fromSymbol);
    const toToken = getTokenBySymbol(toSymbol);
    
    if (!fromToken || !toToken) {
      throw new Error(`Token not found: ${fromSymbol} or ${toSymbol}`);
    }

    try {
      const quote = await this.jupiterClient.getQuote(
        fromToken.mint.toString(),
        toToken.mint.toString(),
        amount,
        fromToken.decimals,
        50 // 0.5% slippage
      );

      if (quote && quote.outAmount) {
        const outputAmount = new Decimal(quote.outAmount).div(Math.pow(10, toToken.decimals));
        const inputAmount = new Decimal(quote.inAmount).div(Math.pow(10, fromToken.decimals));
        const price = outputAmount.div(inputAmount);
        const priceImpact = quote.priceImpactPct ? new Decimal(quote.priceImpactPct) : new Decimal(0);

        return {
          dex: 'Jupiter Aggregator',
          price,
          outputAmount,
          inputAmount,
          priceImpact,
          liquidityAvailable: true,
          source: 'aggregator'
        };
      }
    } catch (error) {
      console.log(`    ⚠️  Jupiter quote failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return null;
  }

  private async getDirectDexPrices(fromSymbol: string, toSymbol: string, amount: Decimal): Promise<DirectDexPrice[]> {
    const prices: DirectDexPrice[] = [];

    // Attempt multiple direct DEX integrations
    console.log(`    🔍 Attempting direct DEX price discovery...`);
    
    // 1. Try Raydium direct API
    try {
      const raydiumPrice = await this.getRaydiumDirectPrice(fromSymbol, toSymbol, amount);
      if (raydiumPrice) {
        prices.push(raydiumPrice);
        console.log(`    ✅ Raydium direct: ${raydiumPrice.price.toFixed(6)}`);
      } else {
        console.log(`    ❌ Raydium: No direct route found`);
      }
    } catch (error) {
      console.log(`    ❌ Raydium: ${error instanceof Error ? error.message.slice(0, 60) : 'Unknown error'}`);
    }

    // 2. Future: Add Orca Whirlpool SDK integration
    // try {
    //   const orcaPrice = await this.getOrcaDirectPrice(fromSymbol, toSymbol, amount);
    //   if (orcaPrice) prices.push(orcaPrice);
    // } catch (error) { /* Handle Orca errors */ }

    // 3. Future: Add Meteora DLMM integration
    // try {
    //   const meteoraPrice = await this.getMeteoraDirectPrice(fromSymbol, toSymbol, amount);
    //   if (meteoraPrice) prices.push(meteoraPrice);
    // } catch (error) { /* Handle Meteora errors */ }

    console.log(`    📊 Direct DEX responses: ${prices.length}`);
    
    if (prices.length === 0) {
      console.log(`    ⚠️  No direct DEX prices available - this is common and expected`);
      console.log(`    💡 Real implementation would require DEX-specific SDKs and authentication`);
    }

    return prices;
  }

  private async getRaydiumDirectPrice(fromSymbol: string, toSymbol: string, amount: Decimal): Promise<DirectDexPrice | null> {
    const fromToken = getTokenBySymbol(fromSymbol);
    const toToken = getTokenBySymbol(toSymbol);
    
    if (!fromToken || !toToken) return null;

    try {
      // ⚠️  IMPORTANT LIMITATION NOTE:
      // This method attempts to get "direct" Raydium prices, but faces challenges:
      // 1. Raydium API endpoint has changed (transaction-v1.raydium.io)
      // 2. API requires additional parameters (txVersion, wallet, etc.)
      // 3. Real arbitrage opportunities are rare due to Jupiter's optimization
      // 4. Price differences often reflect timing/slippage rather than arbitrage
      
      // Use Raydium's current API endpoint
      const response = await axios.get(`https://transaction-v1.raydium.io/compute/swap-base-in`, {
        params: {
          inputMint: fromToken.mint.toString(),
          outputMint: toToken.mint.toString(),
          amount: amount.mul(Math.pow(10, fromToken.decimals)).floor().toString(),
          slippageBps: 50,
          txVersion: 'V0'  // Required parameter
        },
        timeout: 10000
      });

      if (response.data && response.data.data) {
        const outputAmount = new Decimal(response.data.data.outputAmount).div(Math.pow(10, toToken.decimals));
        const inputAmount = amount;
        const price = outputAmount.div(inputAmount);
        const priceImpact = response.data.data.priceImpact ? new Decimal(response.data.data.priceImpact) : new Decimal(0);

        return {
          dex: 'Raydium Direct',
          price,
          outputAmount,
          inputAmount,
          priceImpact,
          liquidityAvailable: true,
          source: 'direct'
        };
      }
    } catch (error) {
      // Expected to fail for many pairs - Raydium doesn't have all trading pairs
      // Also may fail due to API authentication or parameter requirements
      if (error instanceof Error && !error.message.includes('timeout')) {
        console.log(`    ℹ️  Raydium API: ${error.message.slice(0, 100)}`);
      }
    }

    return null;
  }

  private findLegitimateArbitrageOpportunities(
    jupiterPrice: DirectDexPrice | null,
    directPrices: DirectDexPrice[],
    pair: string
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    if (!jupiterPrice || directPrices.length === 0) {
      return opportunities;
    }

    // Compare Jupiter aggregated price vs direct DEX prices
    for (const directPrice of directPrices) {
      // Case 1: Jupiter price is better than direct DEX (buy direct, sell through Jupiter)
      if (jupiterPrice.price.gt(directPrice.price)) {
        const priceDiff = jupiterPrice.price.sub(directPrice.price);
        const profitPercentage = priceDiff.div(directPrice.price);
        
        if (profitPercentage.gte(this.MIN_PROFIT_THRESHOLD)) {
          const grossProfit = priceDiff.mul(directPrice.inputAmount);
          const netProfitAfterGas = grossProfit.sub(this.ESTIMATED_GAS_COST);
          
          opportunities.push({
            pair,
            directDex: directPrice.dex,
            aggregatorPrice: jupiterPrice.price,
            directDexPrice: directPrice.price,
            profit: grossProfit,
            profitPercentage,
            timestamp: new Date().toISOString(),
            estimatedGasCost: this.ESTIMATED_GAS_COST,
            netProfitAfterGas,
            strategy: 'jupiter_vs_direct',
            confidence: this.calculateConfidence(profitPercentage, grossProfit)
          });
        }
      }

      // Case 2: Direct DEX price is better than Jupiter (buy through Jupiter, sell direct)
      if (directPrice.price.gt(jupiterPrice.price)) {
        const priceDiff = directPrice.price.sub(jupiterPrice.price);
        const profitPercentage = priceDiff.div(jupiterPrice.price);
        
        if (profitPercentage.gte(this.MIN_PROFIT_THRESHOLD)) {
          const grossProfit = priceDiff.mul(jupiterPrice.inputAmount);
          const netProfitAfterGas = grossProfit.sub(this.ESTIMATED_GAS_COST);
          
          opportunities.push({
            pair,
            directDex: directPrice.dex,
            aggregatorPrice: jupiterPrice.price,
            directDexPrice: directPrice.price,
            profit: grossProfit,
            profitPercentage,
            timestamp: new Date().toISOString(),
            estimatedGasCost: this.ESTIMATED_GAS_COST,
            netProfitAfterGas,
            strategy: 'jupiter_vs_direct',
            confidence: this.calculateConfidence(profitPercentage, grossProfit)
          });
        }
      }
    }

    return opportunities.sort((a, b) => b.netProfitAfterGas.cmp(a.netProfitAfterGas));
  }

  private calculateConfidence(profitPercentage: Decimal, grossProfit: Decimal): 'high' | 'medium' | 'low' {
    if (profitPercentage.gte(0.01) && grossProfit.gte(0.1)) return 'high';    // >1% profit, >0.1 tokens
    if (profitPercentage.gte(0.005) && grossProfit.gte(0.05)) return 'medium'; // >0.5% profit, >0.05 tokens
    return 'low';
  }

  private convertToLegitimateRecords(
    jupiterPrice: DirectDexPrice | null,
    directPrices: DirectDexPrice[],
    opportunities: ArbitrageOpportunity[],
    pair: string,
    timestamp: string,
    scanNumber: number,
    scanDuration: number
  ): ArbitrageRecord[] {
    const records: ArbitrageRecord[] = [];
    const bestOpportunity = opportunities.length > 0 ? opportunities[0] : null;

    // Add Jupiter aggregator record
    if (jupiterPrice) {
      const relevantOpportunity = opportunities.find(opp => 
        opp.aggregatorPrice.equals(jupiterPrice.price)
      );

      records.push({
        timestamp,
        scanNumber,
        tradingPair: pair,
        dexName: jupiterPrice.dex,
        source: jupiterPrice.source,
        price: jupiterPrice.price.toNumber(),
        inputAmount: jupiterPrice.inputAmount.toNumber(),
        outputAmount: jupiterPrice.outputAmount.toNumber(),
        priceImpact: jupiterPrice.priceImpact.toNumber(),
        liquidityAvailable: jupiterPrice.liquidityAvailable,
        hasArbitrage: !!relevantOpportunity,
        arbitrageStrategy: relevantOpportunity?.strategy || '',
        arbitrageProfitPercent: relevantOpportunity?.profitPercentage.mul(100).toNumber() || 0,
        arbitrageProfitAmount: relevantOpportunity?.profit.toNumber() || 0,
        estimatedGasCost: this.ESTIMATED_GAS_COST.toNumber(),
        netProfitAfterGas: relevantOpportunity?.netProfitAfterGas.toNumber() || 0,
        confidence: relevantOpportunity?.confidence || '',
        scanDurationMs: scanDuration,
        requestId: `req_${this.requestCounter.toString().padStart(4, '0')}`
      });
    }

    // Add direct DEX records
    for (const directPrice of directPrices) {
      const relevantOpportunity = opportunities.find(opp => 
        opp.directDex === directPrice.dex
      );

      records.push({
        timestamp,
        scanNumber,
        tradingPair: pair,
        dexName: directPrice.dex,
        source: directPrice.source,
        price: directPrice.price.toNumber(),
        inputAmount: directPrice.inputAmount.toNumber(),
        outputAmount: directPrice.outputAmount.toNumber(),
        priceImpact: directPrice.priceImpact.toNumber(),
        liquidityAvailable: directPrice.liquidityAvailable,
        hasArbitrage: !!relevantOpportunity,
        arbitrageStrategy: relevantOpportunity?.strategy || '',
        arbitrageProfitPercent: relevantOpportunity?.profitPercentage.mul(100).toNumber() || 0,
        arbitrageProfitAmount: relevantOpportunity?.profit.toNumber() || 0,
        estimatedGasCost: this.ESTIMATED_GAS_COST.toNumber(),
        netProfitAfterGas: relevantOpportunity?.netProfitAfterGas.toNumber() || 0,
        confidence: relevantOpportunity?.confidence || '',
        scanDurationMs: scanDuration,
        requestId: `req_${this.requestCounter.toString().padStart(4, '0')}`
      });
    }

    this.requestCounter++;
    return records;
  }

  private async writeDataToCSV(records: ArbitrageRecord[]) {
    try {
      await this.csvWriter.writeRecords(records);
    } catch (error) {
      console.error('❌ CSV write error:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Execute if run directly
if (require.main === module) {
  const scanner = new LegitimateArbitrageScanner();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⏹️  Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  scanner.startLegitimateScanning().catch(error => {
    console.error('❌ Scanner error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  });
} 