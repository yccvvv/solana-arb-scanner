import 'dotenv/config';
import { OptimizedPriceCollector, TokenPair } from './utils/optimizedPriceCollector';
import { ArbitrageAnalyzer } from './utils/arbitrageAnalyzer';
import Decimal from 'decimal.js';

/**
 * Quick test of the optimized parallel price collection
 * Demonstrates the client's requested optimization: replacing sequential API calls with parallel collection
 */
async function testOptimizedPriceCollection() {
  console.log('🚀 Testing Optimized Parallel Price Collection');
  console.log('='.repeat(60));
  
  const priceCollector = new OptimizedPriceCollector();
  const arbitrageAnalyzer = new ArbitrageAnalyzer();
  
  const testPair: TokenPair = {
    from: 'SOL',
    to: 'USDC',
    amount: new Decimal(1)
  };

  try {
    console.log('\n1. Testing Parallel Price Collection...');
    const startTime = Date.now();
    
    // This implements the client's optimization request:
    // Parallel price collection from multiple DEX sources using Promise.allSettled
    const priceData = await priceCollector.collectRealPrices(testPair, {
      timeout: 3000,
      includeJupiterAggregated: true,
      enableCaching: false
    });
    
    const collectionTime = Date.now() - startTime;
    
    console.log(`✅ Price collection completed in ${collectionTime}ms`);
    console.log(`📊 Sources: ${priceData.metadata.successfulSources} successful, ${priceData.metadata.failedSources} failed`);
    console.log(`🔗 Request ID: ${priceData.metadata.requestId}`);
    
    // Display collected prices
    console.log('\n📈 Collected Prices:');
    if (priceData.raydium && !priceData.raydium.error) {
      console.log(`   Raydium: $${priceData.raydium.price.toFixed(3)} (${priceData.raydium.responseTime}ms)`);
    }
    if (priceData.orca && !priceData.orca.error) {
      console.log(`   Orca: $${priceData.orca.price.toFixed(3)} (${priceData.orca.responseTime}ms)`);
    }
    if (priceData.phoenix && !priceData.phoenix.error) {
      console.log(`   Phoenix: $${priceData.phoenix.price.toFixed(3)} (${priceData.phoenix.responseTime}ms)`);
    }
    if (priceData.jupiter && !priceData.jupiter.error) {
      console.log(`   Jupiter: $${priceData.jupiter.price.toFixed(3)} (${priceData.jupiter.responseTime}ms)`);
    }

    console.log('\n2. Testing Arbitrage Analysis...');
    const analysisStartTime = Date.now();
    
    const analysisResult = await arbitrageAnalyzer.analyzeArbitrageOpportunities(testPair, {
      minProfitThreshold: new Decimal(0.0005),
      maxRiskScore: 0.8,
      includeGasCosts: true,
      enableStatisticalFiltering: true
    });
    
    const analysisTime = Date.now() - analysisStartTime;
    
    console.log(`✅ Analysis completed in ${analysisTime}ms`);
    console.log(`🎯 Opportunities found: ${analysisResult.opportunities.length}`);
    console.log(`📊 Market efficiency: ${(analysisResult.analysis.marketEfficiency * 100).toFixed(1)}%`);
    console.log(`🔍 Data quality: ${(analysisResult.analysis.dataQuality * 100).toFixed(1)}%`);
    
    if (analysisResult.opportunities.length > 0) {
      const best = analysisResult.opportunities[0];
      console.log(`🏆 Best opportunity: ${best.spreadPercentage.mul(100).toFixed(3)}% spread`);
      console.log(`   Buy from: ${best.buyDex} at $${best.buyPrice.toFixed(3)}`);
      console.log(`   Sell to: ${best.sellDex} at $${best.sellPrice.toFixed(3)}`);
      console.log(`   Net profit: $${best.netProfit.toFixed(6)}`);
      console.log(`   Risk score: ${best.riskScore.toFixed(3)}`);
    }

    if (analysisResult.warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${analysisResult.warnings.slice(0, 2).join(', ')}`);
    }

    if (analysisResult.recommendations.length > 0) {
      console.log(`💡 Recommendations: ${analysisResult.recommendations.slice(0, 2).join(', ')}`);
    }

    console.log('\n3. Testing Performance Optimization...');
    
    // Test parallel vs sequential performance
    const pairs = [
      { from: 'SOL', to: 'USDC', amount: new Decimal(1) },
      { from: 'RAY', to: 'SOL', amount: new Decimal(100) },
      { from: 'ORCA', to: 'SOL', amount: new Decimal(100) }
    ];

    // Sequential execution
    const sequentialStart = Date.now();
    for (const pair of pairs) {
      await priceCollector.collectRealPrices(pair, { timeout: 2000 });
    }
    const sequentialTime = Date.now() - sequentialStart;

    // Parallel execution
    const parallelStart = Date.now();
    const promises = pairs.map(pair => 
      priceCollector.collectRealPrices(pair, { timeout: 2000 })
    );
    await Promise.all(promises);
    const parallelTime = Date.now() - parallelStart;

    const speedup = sequentialTime / parallelTime;
    
    console.log(`🚀 Sequential execution: ${sequentialTime}ms`);
    console.log(`⚡ Parallel execution: ${parallelTime}ms`);
    console.log(`📈 Speedup: ${speedup.toFixed(1)}x faster`);

    console.log('\n4. Cache Performance Test...');
    const cacheStats = priceCollector.getCacheStats();
    const cleared = priceCollector.clearExpiredCache();
    
    console.log(`💾 Cache: ${cacheStats.size} entries, ${cleared} expired cleared`);

    console.log('\n✅ All tests completed successfully!');
    console.log('🎯 Key optimizations demonstrated:');
    console.log('   • Parallel API calls using Promise.allSettled');
    console.log('   • Fault-tolerant error handling');
    console.log('   • Response time tracking and monitoring');
    console.log('   • Statistical analysis and filtering');
    console.log('   • Intelligent caching system');
    console.log('   • Risk assessment and confidence scoring');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testOptimizedPriceCollection().catch(console.error);
} 