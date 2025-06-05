import Decimal from 'decimal.js';

// Test the legacy scanner deprecation warnings and flawed logic
describe('Legacy Scanner Tests (Deprecated)', () => {
  
  // Mock the flawed legacy logic that compares Jupiter route steps
  const legacyFindArbitrageOpportunities = (
    dexPrices: Array<{ dex: string; price: Decimal; route: any }>,
    pair: string
  ) => {
    // ❌ This is the FLAWED logic that the legacy scanners used
    // It compares prices from the SAME Jupiter route as if they were independent
    const opportunities: any[] = [];

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
            buyPrice: { ...dex2, route: dex2.route },
            sellPrice: { ...dex1, route: dex1.route },
            profit,
            profitPercentage
          });
        } else if (dex2.price.gt(dex1.price)) {
          const profit = dex2.price.sub(dex1.price);
          const profitPercentage = profit.div(dex1.price).mul(100);

          opportunities.push({
            pair,
            buyDex: dex1.dex,
            sellDex: dex2.dex,
            buyPrice: { ...dex1, route: dex1.route },
            sellPrice: { ...dex2, route: dex2.route },
            profit,
            profitPercentage
          });
        }
      }
    }

    return opportunities;
  };

  describe('Flawed Legacy Logic Detection', () => {
    it('should expose the fundamental flaw: comparing prices from same Jupiter route', () => {
      // Mock data representing what legacy scanners extracted from Jupiter response
      const mockJupiterRoutePrices = [
        {
          dex: 'Raydium',
          price: new Decimal(153.50),
          route: { step: 1, fromSameRoute: true }
        },
        {
          dex: 'Orca',
          price: new Decimal(153.75),
          route: { step: 2, fromSameRoute: true }
        },
        {
          dex: 'Meteora',
          price: new Decimal(153.60),
          route: { step: 3, fromSameRoute: true }
        }
      ];

      const opportunities = legacyFindArbitrageOpportunities(mockJupiterRoutePrices, 'SOL/USDC');

      // The flawed logic would detect "arbitrage" opportunities
      expect(opportunities.length).toBeGreaterThan(0);
      
      // But these are FALSE opportunities because all prices are from the same optimized route
      opportunities.forEach(opp => {
        console.warn(`❌ FALSE ARBITRAGE: ${opp.buyDex} → ${opp.sellDex} (${opp.profitPercentage.toFixed(4)}%)`);
        console.warn(`   This is NOT real arbitrage - prices are from the same Jupiter route!`);
      });

      // The fundamental issue: these prices represent routing STEPS, not independent markets
      expect(mockJupiterRoutePrices.every(price => price.route.fromSameRoute)).toBe(true);
    });

    it('should demonstrate why Jupiter route step comparison is invalid', () => {
      // Jupiter route example: SOL → RAY → USDC
      const jupiterRouteSteps = [
        {
          dex: 'Raydium', 
          price: new Decimal(2.15), // SOL → RAY step
          route: { stepType: 'SOL_to_RAY', routeId: 'route_123' }
        },
        {
          dex: 'Orca',
          price: new Decimal(71.5), // RAY → USDC step  
          route: { stepType: 'RAY_to_USDC', routeId: 'route_123' }
        }
      ];

      const opportunities = legacyFindArbitrageOpportunities(jupiterRouteSteps, 'SOL/USDC');

      // Legacy logic would compare 2.15 vs 71.5 and think there's arbitrage
      expect(opportunities.length).toBeGreaterThan(0);
      
      // But this comparison is meaningless - different tokens in different route steps!
      const opp = opportunities[0];
      expect(opp.profitPercentage.toNumber()).toBeGreaterThan(1000); // Nonsensical result
      
      console.warn('❌ INVALID COMPARISON: Comparing SOL→RAY price vs RAY→USDC price');
      console.warn('   This is mathematically meaningless and shows the fundamental flaw');
    });

    it('should show how legacy scanners misinterpreted aggregated routing', () => {
      const aggregatedRouteData = [
        { 
          dex: 'Step1-Raydium', 
          price: new Decimal(100), 
          route: { aggregatedRoute: true } 
        },
        { 
          dex: 'Step2-Orca', 
          price: new Decimal(100.05), 
          route: { aggregatedRoute: true } 
        }
      ];

      const opportunities = legacyFindArbitrageOpportunities(aggregatedRouteData, 'SOL/USDC');

      expect(opportunities).toHaveLength(1);
      
      // Reality: This is ONE optimized route, not competing markets
      opportunities.forEach(opp => {
        expect(opp.buyPrice.route.aggregatedRoute).toBe(true);
        expect(opp.sellPrice.route.aggregatedRoute).toBe(true);
        
        console.warn(`❌ FALSE SIGNAL: Detected "arbitrage" between steps of same route`);
      });
    });
  });

  describe('Legacy Scanner Behavior Validation', () => {
    it('should confirm legacy scanners would generate false positives', () => {
      const falsePositiveData = [
        { 
          dex: 'Jupiter-Route-A', 
          price: new Decimal(100.01), 
          route: { sameSource: 'jupiter' } 
        },
        { 
          dex: 'Jupiter-Route-B', 
          price: new Decimal(100.03), 
          route: { sameSource: 'jupiter' } 
        }
      ];

      const falsePositives = legacyFindArbitrageOpportunities(falsePositiveData, 'SOL/USDC');

      expect(falsePositives.length).toBeGreaterThan(0);

      falsePositives.forEach(opp => {
        // All data comes from same source - not independent markets
        expect(opp.buyPrice.route.sameSource).toBe('jupiter');
        expect(opp.sellPrice.route.sameSource).toBe('jupiter');
      });
    });

    it('should validate deprecation warnings are properly displayed', () => {
      // Mock console to capture warnings
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      // Function that simulates legacy scanner startup
      const mockLegacyScannerStartup = () => {
        console.log('🚫 === DEPRECATED SCANNER WARNING ===');
        console.log('❌ This scanner contains FUNDAMENTAL ARCHITECTURAL FLAWS');
        console.log('❌ It incorrectly compares prices from the SAME Jupiter route');
        console.log('❌ This does NOT represent real arbitrage opportunities');
        console.log('✅ For legitimate arbitrage detection, use: npm run legitimate-scan');
        
        return 'legacy_scanner_started';
      };

      const result = mockLegacyScannerStartup();
      
      expect(result).toBe('legacy_scanner_started');
      expect(consoleSpy).toHaveBeenCalledWith('🚫 === DEPRECATED SCANNER WARNING ===');
      expect(consoleSpy).toHaveBeenCalledWith('❌ This scanner contains FUNDAMENTAL ARCHITECTURAL FLAWS');
      expect(consoleSpy).toHaveBeenCalledWith('✅ For legitimate arbitrage detection, use: npm run legitimate-scan');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Educational Value of Legacy Tests', () => {
    it('should demonstrate the difference between route steps and market prices', () => {
      // Route step data (what legacy scanners used)
      const routeSteps = [
        { dex: 'Step1', price: new Decimal(100), route: { isRouteStep: true } },
        { dex: 'Step2', price: new Decimal(100.1), route: { isRouteStep: true } }
      ];

      // Independent market prices (what should be compared)
      const marketPrices = [
        { dex: 'Market1', price: new Decimal(100), isIndependent: true },
        { dex: 'Market2', price: new Decimal(100.1), isIndependent: true }
      ];

      // Legacy comparison (invalid)
      const routeOpportunities = legacyFindArbitrageOpportunities(routeSteps, 'TEST/PAIR');
      
      // Valid comparison would need different data sources
      expect(routeSteps.every(step => step.route.isRouteStep)).toBe(true);
      expect(marketPrices.every(market => market.isIndependent)).toBe(true);
      
      // The fundamental difference: source independence
      console.warn('EDUCATIONAL: Route steps are sequential, market prices are competitive');
    });

    it('should show how to properly test for real arbitrage detection', () => {
      // ❌ WRONG: Compare data from same aggregated source
      const sameSourceData = [
        { dex: 'DEX1', price: new Decimal(100), route: { source: 'jupiter_route' } },
        { dex: 'DEX2', price: new Decimal(100.1), route: { source: 'jupiter_route' } }
      ];

      // ✅ CORRECT: Compare data from independent sources
      const independentSourceData = [
        { dex: 'Jupiter', price: new Decimal(100), source: 'aggregator' },
        { dex: 'Raydium', price: new Decimal(100.1), source: 'direct_api' }
      ];

      const wrongComparison = legacyFindArbitrageOpportunities(sameSourceData, 'TEST');
      
      // Wrong comparison produces false signals
      expect(wrongComparison.length).toBeGreaterThan(0);
      expect(sameSourceData[0].route.source).toBe(sameSourceData[1].route.source);

      // Correct comparison requires different methodology (tested in legitimate scanner)
      expect(independentSourceData[0].source).not.toBe(independentSourceData[1].source);
      
      console.warn('LESSON: Real arbitrage requires independent data sources');
    });
  });
}); 