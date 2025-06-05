import { OptimizedPriceCollector, TokenPair, DEXPriceMap, DEXPrice } from '../../src/utils/optimizedPriceCollector';
import Decimal from 'decimal.js';

// Mock axios for testing
jest.mock('axios');

describe('OptimizedPriceCollector Tests', () => {
  let priceCollector: OptimizedPriceCollector;
  let mockTokenPair: TokenPair;

  beforeEach(() => {
    priceCollector = new OptimizedPriceCollector();
    mockTokenPair = {
      from: 'SOL',
      to: 'USDC',
      amount: new Decimal(1)
    };
    jest.clearAllMocks();
  });

  describe('Parallel Price Collection', () => {
    it('should collect prices from multiple DEXes in parallel', async () => {
      const startTime = Date.now();
      
      const result = await priceCollector.collectRealPrices(mockTokenPair, {
        timeout: 2000,
        includeJupiterAggregated: true
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete faster than sequential execution
      expect(executionTime).toBeLessThan(1000); // Less than 1 second

      // Should have metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalResponseTime).toBeGreaterThan(0);
      expect(result.metadata.requestId).toMatch(/^req_\d+_\d+$/);
      expect(result.metadata.timestamp).toBeGreaterThan(startTime);

      // Should attempt all sources
      const attemptedSources = result.metadata.successfulSources + result.metadata.failedSources;
      expect(attemptedSources).toBe(4); // Raydium, Orca, Phoenix, Jupiter

      console.log(`✅ Performance: Parallel collection in ${executionTime}ms`);
      console.log(`📊 Sources: ${result.metadata.successfulSources} successful, ${result.metadata.failedSources} failed`);
    });

    it('should handle individual DEX failures gracefully', async () => {
      // Test with very short timeout to force some failures
      const result = await priceCollector.collectRealPrices(mockTokenPair, {
        timeout: 1, // 1ms timeout to force failures
        includeJupiterAggregated: true
      });

      // Should still return a valid result structure
      expect(result.metadata).toBeDefined();
      expect(result.metadata.failedSources).toBeGreaterThan(0);

      // Failed sources should not have valid price data
      const failedSources: string[] = [];
      if (result.raydium?.error) failedSources.push('raydium');
      if (result.orca?.error) failedSources.push('orca');
      if (result.phoenix?.error) failedSources.push('phoenix');
      if (result.jupiter?.error) failedSources.push('jupiter');

      expect(failedSources.length).toBeGreaterThan(0);

      console.log(`✅ Fault tolerance: ${failedSources.length} sources failed gracefully`);
    });

    it('should provide detailed response time metrics', async () => {
      const result = await priceCollector.collectRealPrices(mockTokenPair);

      // Check individual response times
      const responseTimes: number[] = [];
      
      if (result.raydium && !result.raydium.error) {
        expect(result.raydium.responseTime).toBeGreaterThan(0);
        responseTimes.push(result.raydium.responseTime);
      }
      
      if (result.orca && !result.orca.error) {
        expect(result.orca.responseTime).toBeGreaterThan(0);
        responseTimes.push(result.orca.responseTime);
      }
      
      if (result.phoenix && !result.phoenix.error) {
        expect(result.phoenix.responseTime).toBeGreaterThan(0);
        responseTimes.push(result.phoenix.responseTime);
      }
      
      if (result.jupiter && !result.jupiter.error) {
        expect(result.jupiter.responseTime).toBeGreaterThan(0);
        responseTimes.push(result.jupiter.responseTime);
      }

      if (responseTimes.length > 0) {
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);
        const minResponseTime = Math.min(...responseTimes);

        expect(avgResponseTime).toBeGreaterThan(0);
        expect(maxResponseTime).toBeGreaterThanOrEqual(minResponseTime);

        console.log(`📊 Response times: avg ${avgResponseTime.toFixed(1)}ms, min ${minResponseTime}ms, max ${maxResponseTime}ms`);
      }
    });
  });

  describe('Price Data Validation', () => {
    it('should return valid price structures for successful responses', async () => {
      const result = await priceCollector.collectRealPrices(mockTokenPair);

      const validSources: string[] = [];

      // Validate each successful source
      Object.entries(result).forEach(([key, value]) => {
        if (key === 'metadata') return;

        const price = value as DEXPrice;
        if (price && !price.error) {
          validSources.push(key);

          // Basic structure validation
          expect(price.dex).toBeDefined();
          expect(price.price).toBeInstanceOf(Decimal);
          expect(price.outputAmount).toBeInstanceOf(Decimal);
          expect(price.inputAmount).toBeInstanceOf(Decimal);
          expect(price.priceImpact).toBeInstanceOf(Decimal);
          expect(typeof price.liquidityAvailable).toBe('boolean');
          expect(['direct', 'aggregator']).toContain(price.source);
          expect(typeof price.responseTime).toBe('number');
          expect(typeof price.confidence).toBe('number');
          expect(typeof price.timestamp).toBe('number');

          // Value validation
          expect(price.price.gt(0)).toBe(true);
          expect(price.outputAmount.gte(0)).toBe(true);
          expect(price.inputAmount.gt(0)).toBe(true);
          expect(price.priceImpact.gte(0)).toBe(true);
          expect(price.confidence).toBeGreaterThanOrEqual(0);
          expect(price.confidence).toBeLessThanOrEqual(1);
          expect(price.responseTime).toBeGreaterThan(0);
        }
      });

      expect(validSources.length).toBeGreaterThan(0);
      console.log(`✅ Validation: ${validSources.length} sources returned valid data`);
    });

    it('should handle invalid token pairs gracefully', async () => {
      const invalidPair: TokenPair = {
        from: 'INVALID',
        to: 'TOKEN',
        amount: new Decimal(1)
      };

      await expect(
        priceCollector.collectRealPrices(invalidPair)
      ).rejects.toThrow('Invalid token pair');
    });

    it('should validate price consistency across sources', async () => {
      const result = await priceCollector.collectRealPrices(mockTokenPair);

      const validPrices: Decimal[] = [];

      // Collect valid prices
      Object.entries(result).forEach(([key, value]) => {
        if (key === 'metadata') return;

        const price = value as DEXPrice;
        if (price && !price.error && price.price.gt(0)) {
          validPrices.push(price.price);
        }
      });

      if (validPrices.length >= 2) {
        // Prices should be reasonably close (within 10% of each other)
        const minPrice = validPrices.reduce((min, price) => price.lt(min) ? price : min);
        const maxPrice = validPrices.reduce((max, price) => price.gt(max) ? price : max);
        const spread = maxPrice.sub(minPrice).div(minPrice);

        expect(spread.lt(0.1)).toBe(true); // Less than 10% spread

        console.log(`✅ Price consistency: ${spread.mul(100).toFixed(3)}% spread across sources`);
      }
    });
  });

  describe('Performance Optimization', () => {
    it('should execute parallel calls faster than sequential', async () => {
      // This test validates the core optimization request
      const pairs = [
        { from: 'SOL', to: 'USDC', amount: new Decimal(1) },
        { from: 'RAY', to: 'USDC', amount: new Decimal(100) },
        { from: 'ORCA', to: 'SOL', amount: new Decimal(100) }
      ];

      // Sequential execution simulation
      const sequentialStart = Date.now();
      for (const pair of pairs) {
        await priceCollector.collectRealPrices(pair);
      }
      const sequentialTime = Date.now() - sequentialStart;

      // Parallel execution
      const parallelStart = Date.now();
      const promises = pairs.map(pair => priceCollector.collectRealPrices(pair));
      await Promise.all(promises);
      const parallelTime = Date.now() - parallelStart;

      // Parallel should be significantly faster
      const speedupRatio = sequentialTime / parallelTime;
      expect(speedupRatio).toBeGreaterThan(1.5); // At least 50% faster

      console.log(`🚀 Performance: Parallel execution ${speedupRatio.toFixed(1)}x faster`);
      console.log(`   Sequential: ${sequentialTime}ms, Parallel: ${parallelTime}ms`);
    });

    it('should handle high concurrency without degradation', async () => {
      const concurrentRequests = 5; // Reduced for faster testing
      const promises = Array(concurrentRequests).fill(null).map(() =>
        priceCollector.collectRealPrices(mockTokenPair)
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const totalTime = Date.now() - startTime;

      const successfulResults = results.filter(r => r.status === 'fulfilled').length;
      const avgTimePerRequest = totalTime / concurrentRequests;

      expect(successfulResults).toBeGreaterThan(0);
      expect(avgTimePerRequest).toBeLessThan(2000); // Less than 2s per request

      console.log(`🔄 Concurrency: ${successfulResults}/${concurrentRequests} successful in ${totalTime}ms`);
    });
  });

  describe('Configuration and Options', () => {
    it('should respect timeout configuration', async () => {
      const shortTimeout = 100; // 100ms
      const startTime = Date.now();

      const result = await priceCollector.collectRealPrices(mockTokenPair, {
        timeout: shortTimeout
      });

      const totalTime = Date.now() - startTime;
      
      // Should complete reasonably quickly due to timeout
      expect(totalTime).toBeLessThan(shortTimeout * 5); // Within 5x timeout

      // Should attempt all sources
      expect(result.metadata.failedSources + result.metadata.successfulSources).toBe(4);

      console.log(`⏱️ Timeout: Completed in ${totalTime}ms with ${shortTimeout}ms timeout`);
    });

    it('should include/exclude Jupiter aggregated prices', async () => {
      // With Jupiter
      const withJupiter = await priceCollector.collectRealPrices(mockTokenPair, {
        includeJupiterAggregated: true
      });

      // Without Jupiter  
      const withoutJupiter = await priceCollector.collectRealPrices(mockTokenPair, {
        includeJupiterAggregated: false
      });

      // Should have different source counts
      expect(withJupiter.metadata.successfulSources + withJupiter.metadata.failedSources).toBe(4);
      expect(withoutJupiter.metadata.successfulSources + withoutJupiter.metadata.failedSources).toBe(3);

      console.log(`🎛️ Configuration: Jupiter inclusion works correctly`);
    });
  });

  describe('Cache Management', () => {
    it('should manage cache efficiently', () => {
      const cacheStats = priceCollector.getCacheStats();
      expect(typeof cacheStats.size).toBe('number');
      expect(typeof cacheStats.expired).toBe('number');

      const cleared = priceCollector.clearExpiredCache();
      expect(cleared).toBeGreaterThanOrEqual(0);

      console.log(`✅ Cache: ${cacheStats.size} entries, ${cleared} expired cleared`);
    });
  });
}); 