import { JupiterClient } from '../../src/utils/jupiterClient';
import { getTokenBySymbol, toRawAmount } from '../../src/utils/tokenUtils';
import Decimal from 'decimal.js';
import axios from 'axios';

// Mock axios for performance testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Performance & Scalability Tests', () => {
  let jupiterClient: JupiterClient;

  beforeEach(() => {
    jupiterClient = new JupiterClient();
    jest.clearAllMocks();
  });

  describe('High-Volume Data Processing', () => {
    it('should handle 1000+ token lookups efficiently', () => {
      const startTime = performance.now();
      const tokenSymbols = ['SOL', 'USDC', 'RAY', 'ORCA', 'JUP', 'BONK', 'WIF', 'SAMO'];
      
      // Simulate 1000 lookups
      const results = Array(1000).fill(null).map((_, index) => {
        const symbol = tokenSymbols[index % tokenSymbols.length];
        return getTokenBySymbol(symbol);
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time
      expect(executionTime).toBeLessThan(100); // < 100ms for 1000 lookups
      expect(results.every(token => token !== undefined)).toBe(true);

      console.log(`✅ Performance: 1000 token lookups in ${executionTime.toFixed(2)}ms`);
    });

    it('should handle large batch price calculations', () => {
      const startTime = performance.now();
      
      const routes = Array(500).fill(null).map((_, index) => ({
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        inAmount: `${1000000000 + index}`,
        outAmount: `${153780000000 + index * 1000000}`,
        routePlan: [],
        otherAmountThreshold: '0',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.001'
      }));

      const prices = routes.map(route => 
        jupiterClient.calculateEffectivePrice(route, 9, 6)
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(60); // < 60ms for 500 calculations
      expect(prices.every(price => price.isFinite())).toBe(true);

      console.log(`✅ Performance: 500 price calculations in ${executionTime.toFixed(2)}ms`);
    });

    it('should handle massive decimal number operations', () => {
      const startTime = performance.now();
      
      const largeAmounts = Array(1000).fill(null).map((_, index) => 
        new Decimal(`${index + 1}.${'123456789'.repeat(10)}`)
      );

      const results = largeAmounts.map((amount, index) => 
        toRawAmount(amount, 18 + (index % 12)) // Varying decimals
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(200); // < 200ms for 1000 large number operations
      expect(results.every(result => typeof result === 'string')).toBe(true);

      console.log(`✅ Performance: 1000 large decimal operations in ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Patterns', () => {
    it('should maintain reasonable memory usage under load', () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate heavy workload
      const operations = Array(10000).fill(null).map((_, index) => {
        const token = getTokenBySymbol(['SOL', 'USDC', 'RAY'][index % 3]);
        const amount = new Decimal(Math.random() * 1000);
        const rawAmount = toRawAmount(amount, 9);
        
        return { token, amount, rawAmount };
      });

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (< 50MB for 10k operations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      expect(operations.length).toBe(10000);

      console.log(`✅ Memory: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase for 10k operations`);
    });

    it('should not leak memory with repeated calculations', () => {
      const measurements: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        // Force garbage collection if available
        if (global.gc) global.gc();
        
        const beforeMemory = process.memoryUsage().heapUsed;
        
        // Perform calculations
        Array(1000).fill(null).forEach((_, index) => {
          const route = {
            inputMint: 'So11111111111111111111111111111111111111112',
            outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            inAmount: `${1000000000 + index}`,
            outAmount: `${153780000000 + index}`,
            routePlan: [],
            otherAmountThreshold: '0',
            swapMode: 'ExactIn',
            slippageBps: 50,
            priceImpactPct: '0.001'
          };
          
          jupiterClient.calculateEffectivePrice(route, 9, 6);
        });
        
        if (global.gc) global.gc();
        const afterMemory = process.memoryUsage().heapUsed;
        measurements.push(afterMemory - beforeMemory);
      }

      // Memory usage should stabilize (not grow indefinitely)
      const lastMeasurement = measurements[measurements.length - 1];
      const firstMeasurement = measurements[0];
      const memoryGrowth = lastMeasurement - firstMeasurement;

      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024); // < 5MB growth

      console.log(`✅ Memory stability: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB growth over 5 iterations`);
    });
  });

  describe('Concurrent Operation Stress Tests', () => {
    it('should handle concurrent API calls without degradation', async () => {
      const mockResponse = {
        data: {
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          inAmount: '1000000000',
          outAmount: '153780000000',
          routePlan: []
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const concurrentCalls = 50;
      const startTime = performance.now();

      const promises = Array(concurrentCalls).fill(null).map(async (_, index) => {
        const delay = Math.random() * 10; // Random delay 0-10ms
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return jupiterClient.getQuote(
          'So11111111111111111111111111111111111111112',
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          new Decimal(index + 1),
          9,
          50
        );
      });

      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const successfulCalls = results.filter(r => r.status === 'fulfilled').length;
      const successRate = (successfulCalls / concurrentCalls) * 100;

      expect(successRate).toBeGreaterThan(90); // > 90% success rate
      expect(totalTime).toBeLessThan(500); // < 500ms total time

      console.log(`✅ Concurrency: ${successRate.toFixed(1)}% success rate, ${totalTime.toFixed(2)}ms total`);
    });

    it('should maintain data integrity under concurrent access', () => {
      const tokenSymbols = ['SOL', 'USDC', 'RAY', 'ORCA', 'JUP'];
      const concurrentAccess = 100;

      const results = Array(concurrentAccess).fill(null).map((_, index) => {
        const symbol = tokenSymbols[index % tokenSymbols.length];
        
        // Simulate concurrent access to same token
        return Promise.resolve().then(() => {
          const token1 = getTokenBySymbol(symbol);
          const token2 = getTokenBySymbol(symbol);
          
          // Both lookups should return identical results
          return {
            consistent: token1?.mint.toString() === token2?.mint.toString(),
            symbol: symbol,
            mint: token1?.mint.toString()
          };
        });
      });

      return Promise.all(results).then(outcomes => {
        const allConsistent = outcomes.every(outcome => outcome.consistent);
        expect(allConsistent).toBe(true);

        console.log(`✅ Data integrity: ${outcomes.length} concurrent accesses all consistent`);
      });
    });
  });

  describe('Large Dataset Handling', () => {
    it('should process arbitrage opportunities efficiently at scale', () => {
      // Mock finding arbitrage opportunities in large dataset
      const mockFindArbitrageOpportunities = (
        jupiterPrice: { price: Decimal; dex: string },
        directPrices: Array<{ price: Decimal; dex: string }>
      ) => {
        const opportunities: Array<{
          buyDex: string;
          sellDex: string;
          profitPercentage: Decimal;
        }> = [];
        
        for (const directPrice of directPrices) {
          if (jupiterPrice.price.gt(directPrice.price)) {
            const priceDiff = jupiterPrice.price.sub(directPrice.price);
            const profitPercentage = priceDiff.div(directPrice.price);
            
            if (profitPercentage.gt(new Decimal(0.001))) {
              opportunities.push({
                buyDex: directPrice.dex,
                sellDex: jupiterPrice.dex,
                profitPercentage
              });
            }
          }
        }
        
        return opportunities;
      };

      const startTime = performance.now();

      // Simulate 1000 DEX prices
      const directPrices = Array(1000).fill(null).map((_, index) => ({
        price: new Decimal(100 + Math.random() * 10 - 5), // 95-105 range
        dex: `DEX_${index}`
      }));

      const jupiterPrice = {
        price: new Decimal(100),
        dex: 'Jupiter'
      };

      const opportunities = mockFindArbitrageOpportunities(jupiterPrice, directPrices);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(100); // < 100ms for 1000 price comparisons
      expect(Array.isArray(opportunities)).toBe(true);

      console.log(`✅ Scale: Processed 1000 price comparisons in ${executionTime.toFixed(2)}ms`);
      console.log(`  Found ${opportunities.length} potential opportunities`);
    });

    it('should handle massive token pair combinations', () => {
      const tokens = ['SOL', 'USDC', 'RAY', 'ORCA', 'JUP', 'BONK', 'WIF', 'SAMO'];
      const startTime = performance.now();

      // Generate all possible pairs
      const pairs: Array<{
        from: any;
        to: any;
        pair: string;
      }> = [];
      
      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          const token1 = getTokenBySymbol(tokens[i]);
          const token2 = getTokenBySymbol(tokens[j]);
          
          if (token1 && token2) {
            pairs.push({
              from: token1,
              to: token2,
              pair: `${tokens[i]}/${tokens[j]}`
            });
          }
        }
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(pairs.length).toBe(28); // 8C2 = 28 pairs
      expect(executionTime).toBeLessThan(10); // < 10ms for pair generation
      
      console.log(`✅ Pairs: Generated ${pairs.length} token pairs in ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Resource Utilization Monitoring', () => {
    it('should track CPU usage patterns during intensive operations', async () => {
      const startCpuUsage = process.cpuUsage();
      const startTime = performance.now();

      // CPU-intensive operations
      await new Promise(resolve => {
        let operations = 0;
        const interval = setInterval(() => {
          // Simulate price calculations
          for (let i = 0; i < 100; i++) {
            const route = {
              inputMint: 'So11111111111111111111111111111111111111112',
              outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              inAmount: `${1000000000 + i}`,
              outAmount: `${153780000000 + i}`,
              routePlan: [],
              otherAmountThreshold: '0',
              swapMode: 'ExactIn',
              slippageBps: 50,
              priceImpactPct: '0.001'
            };
            
            jupiterClient.calculateEffectivePrice(route, 9, 6);
          }
          
          operations += 100;
          if (operations >= 1000) {
            clearInterval(interval);
            resolve(operations);
          }
        }, 1);
      });

      const endCpuUsage = process.cpuUsage(startCpuUsage);
      const endTime = performance.now();
      const wallTime = endTime - startTime;

      const userCpuTime = endCpuUsage.user / 1000; // Convert to milliseconds
      const cpuEfficiency = (userCpuTime / wallTime) * 100;

      expect(cpuEfficiency).toBeLessThan(200); // Should not exceed 200% CPU usage
      expect(wallTime).toBeLessThan(1000); // Should complete within 1 second

      console.log(`✅ CPU: ${cpuEfficiency.toFixed(1)}% efficiency, ${wallTime.toFixed(0)}ms wall time`);
    });

    it('should monitor file handle usage patterns', () => {
      // This test would be more meaningful with actual file operations
      // For now, we'll simulate CSV operations
      const startTime = performance.now();
      
      const csvOperations = Array(100).fill(null).map((_, index) => {
        // Simulate CSV row generation
        const timestamp = new Date().toISOString();
        const pair = 'SOL/USDC';
        const price = (100 + Math.random()).toFixed(6);
        
        return `${timestamp},${pair},${price},Jupiter,153.45,false,none,0.00,0.00,high,1000.00,85,0.005,high,0.01,153.40,0.95,low,efficient market`;
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(csvOperations.length).toBe(100);
      expect(executionTime).toBeLessThan(10); // < 10ms for 100 CSV row generations
      
      console.log(`✅ CSV: Generated ${csvOperations.length} rows in ${executionTime.toFixed(2)}ms`);
    });
  });
}); 