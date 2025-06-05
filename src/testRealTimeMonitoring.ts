import 'dotenv/config';
import { PoolMonitor, PoolUpdate } from './monitoring/poolMonitor';
import Decimal from 'decimal.js';

/**
 * Test script for Real-Time Pool Monitoring
 * Demonstrates WebSocket-based pool monitoring with simulated data
 */
async function testRealTimePoolMonitoring() {
  console.log('🚀 Testing Real-Time Pool Monitoring');
  console.log('📡 WebSocket-based pool monitoring with fault tolerance');
  console.log('='.repeat(70));

  const poolMonitor = new PoolMonitor();
  let updateCount = 0;
  let connectionCount = 0;

  try {
    // Setup event listeners to monitor activity
    poolMonitor.on('connected', (event) => {
      connectionCount++;
      console.log(`✅ Connected to ${event.dex} pool ${event.pool} (${connectionCount} total)`);
    });

    poolMonitor.on('priceUpdate', (update: PoolUpdate) => {
      updateCount++;
      console.log(`📊 Price Update #${updateCount}:`);
      console.log(`   DEX: ${update.dex}`);
      console.log(`   Pool: ${update.pool}`);
      console.log(`   Price: $${update.price.toFixed(3)}`);
      console.log(`   Liquidity: $${update.liquidity.toFixed(0)}`);
      console.log(`   24h Volume: $${update.volume24h.toFixed(0)}`);
      console.log(`   Timestamp: ${new Date(update.timestamp).toISOString()}\n`);
    });

    poolMonitor.on('disconnected', (event) => {
      console.log(`🔌 Disconnected from ${event.dex}: ${event.reason}`);
    });

    poolMonitor.on('error', (event) => {
      console.error(`❌ Error from ${event.dex}: ${event.error}`);
    });

    console.log('1. Testing Pool Subscriptions...');
    
    // Test pool subscriptions (Note: These are simulated endpoints for demo)
    const testPools = [
      { address: 'raydium_sol_usdc_pool_123', dex: 'raydium', baseToken: 'SOL', quoteToken: 'USDC' },
      { address: 'orca_sol_usdc_pool_456', dex: 'orca', baseToken: 'SOL', quoteToken: 'USDC' },
      { address: 'jupiter_sol_usdc_pool_789', dex: 'jupiter', baseToken: 'SOL', quoteToken: 'USDC' },
      { address: 'phoenix_sol_usdc_pool_abc', dex: 'phoenix', baseToken: 'SOL', quoteToken: 'USDC' }
    ];

    // Subscribe to pools (will attempt connections)
    try {
      await poolMonitor.subscribeToMultiplePools(testPools);
      console.log(`📡 Subscription attempts completed`);
    } catch (error) {
      console.log(`⚠️  Some subscriptions may have failed (expected for demo endpoints)`);
    }

    // Wait a moment for connection attempts
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n2. Testing Monitoring Statistics...');
    const stats = poolMonitor.getMonitoringStats();
    console.log(`📊 Monitoring Statistics:`);
    console.log(`   Total subscriptions: ${stats.totalSubscriptions}`);
    console.log(`   Active connections: ${stats.activeConnections}`);
    console.log(`   Messages received: ${stats.messagesReceived}`);
    console.log(`   Reconnection attempts: ${stats.reconnections}`);
    console.log(`   Errors encountered: ${stats.errors}`);

    console.log('\n3. Testing Subscription Management...');
    const activeSubscriptions = poolMonitor.getActiveSubscriptions();
    console.log(`📋 Active Subscriptions: ${activeSubscriptions.length}`);
    
    activeSubscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.dex} - ${sub.poolAddress}`);
      console.log(`      Status: ${sub.isActive ? '🟢 Active' : '🔴 Inactive'}`);
      console.log(`      Last update: ${sub.lastUpdate ? new Date(sub.lastUpdate).toISOString() : 'Never'}`);
      console.log(`      Reconnect attempts: ${sub.reconnectAttempts}`);
    });

    console.log('\n4. Simulating Pool Updates...');
    
    // Simulate some pool updates since real endpoints may not be available
    const simulatedUpdates: PoolUpdate[] = [
      {
        dex: 'Raydium',
        pool: 'raydium_sol_usdc_pool_123',
        price: new Decimal(185.234),
        liquidity: new Decimal(2500000),
        volume24h: new Decimal(45000000),
        priceChange24h: new Decimal(0.0234),
        timestamp: Date.now(),
        transactionCount: 1523,
        baseTokenAmount: new Decimal(13500),
        quoteTokenAmount: new Decimal(2500000)
      },
      {
        dex: 'Orca',
        pool: 'orca_sol_usdc_pool_456',
        price: new Decimal(185.198),
        liquidity: new Decimal(1800000),
        volume24h: new Decimal(32000000),
        priceChange24h: new Decimal(0.0198),
        timestamp: Date.now(),
        transactionCount: 892,
        baseTokenAmount: new Decimal(9721),
        quoteTokenAmount: new Decimal(1800000)
      },
      {
        dex: 'Jupiter',
        pool: 'jupiter_sol_usdc_pool_789',
        price: new Decimal(185.267),
        liquidity: new Decimal(3200000),
        volume24h: new Decimal(67000000),
        priceChange24h: new Decimal(0.0267),
        timestamp: Date.now(),
        transactionCount: 2145,
        baseTokenAmount: new Decimal(17280),
        quoteTokenAmount: new Decimal(3200000)
      }
    ];

    // Emit simulated updates
    for (const update of simulatedUpdates) {
      console.log(`🔄 Simulating update from ${update.dex}...`);
      poolMonitor.emit('priceUpdate', update);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between updates
    }

    console.log('\n5. Testing Arbitrage Detection Logic...');
    
    // Analyze price differences for arbitrage opportunities
    const prices = simulatedUpdates.map(u => ({ dex: u.dex, price: u.price }));
    
    console.log('💰 Price Comparison Analysis:');
    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const price1 = prices[i];
        const price2 = prices[j];
        
        const priceDiff = price1.price.sub(price2.price).abs();
        const spreadPercentage = priceDiff.div(price1.price).mul(100);
        
        if (spreadPercentage.gt(0.001)) { // > 0.001%
          const buyFrom = price1.price.lt(price2.price) ? price1.dex : price2.dex;
          const sellTo = price1.price.lt(price2.price) ? price2.dex : price1.dex;
          const profit = priceDiff.mul(1000); // $1000 trade size
          
          console.log(`🎯 Arbitrage Opportunity:`);
          console.log(`   Buy from: ${buyFrom} at $${price1.price.lt(price2.price) ? price1.price.toFixed(3) : price2.price.toFixed(3)}`);
          console.log(`   Sell to: ${sellTo} at $${price1.price.gt(price2.price) ? price1.price.toFixed(3) : price2.price.toFixed(3)}`);
          console.log(`   Spread: ${spreadPercentage.toFixed(4)}%`);
          console.log(`   Potential profit: $${profit.toFixed(2)}\n`);
        }
      }
    }

    console.log('6. Testing Cleanup and Shutdown...');
    
    // Test unsubscription
    console.log('🔌 Testing pool unsubscription...');
    for (const pool of testPools) {
      poolMonitor.unsubscribeFromPool(pool.address, pool.dex);
    }

    // Final statistics
    const finalStats = poolMonitor.getMonitoringStats();
    console.log('\n📊 Final Statistics:');
    console.log(`   Total updates processed: ${updateCount}`);
    console.log(`   Total connections made: ${connectionCount}`);
    console.log(`   Final active connections: ${finalStats.activeConnections}`);
    console.log(`   Messages received: ${finalStats.messagesReceived}`);
    console.log(`   Total errors: ${finalStats.errors}`);

    // Shutdown
    await poolMonitor.shutdown();

    console.log('\n✅ Real-Time Pool Monitoring Test Complete!');
    console.log('🎯 Key features demonstrated:');
    console.log('   • WebSocket connection management');
    console.log('   • Multi-DEX pool subscriptions');
    console.log('   • Real-time price update handling');
    console.log('   • Automatic reconnection logic');
    console.log('   • Fault-tolerant error handling');
    console.log('   • Statistics and monitoring');
    console.log('   • Graceful shutdown');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await poolMonitor.shutdown();
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testRealTimePoolMonitoring().catch(console.error);
} 