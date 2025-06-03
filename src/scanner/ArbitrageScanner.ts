import { EventEmitter } from 'events';
import { Connection, PublicKey } from '@solana/web3.js';
import Decimal from 'decimal.js';
import { ScannerConfig } from '../config/config';
import { 
  PriceData, 
  ArbitrageOpportunity, 
  ScannerMetrics, 
  ScannerEvent, 
  ScannerEventData,
  TokenInfo,
  PoolState
} from '../types';
import { JupiterClient } from '../utils/jupiterClient';
import { 
  getTokenBySymbol, 
  calculateProfitPercentage, 
  createPairId,
  formatTokenAmount,
  formatPrice
} from '../utils/tokenUtils';

export class ArbitrageScanner extends EventEmitter {
  private connection: Connection;
  private config: ScannerConfig;
  private jupiterClient: JupiterClient;
  private running: boolean = false;
  private priceCache: Map<string, PriceData[]> = new Map();
  private poolCache: Map<string, PoolState> = new Map();
  private metrics: ScannerMetrics;
  private scanInterval: NodeJS.Timeout | null = null;

  constructor(config: ScannerConfig) {
    super();
    this.config = config;
    this.connection = new Connection(config.rpcEndpoint, 'confirmed');
    this.jupiterClient = new JupiterClient(config.jupiter.apiEndpoint);
    
    this.metrics = {
      totalScans: 0,
      opportunitiesFound: 0,
      averageProfitPercentage: new Decimal(0),
      topOpportunity: null,
      lastScanTime: 0,
      dexStatus: {}
    };

    // Initialize DEX status
    Object.keys(config.dexes).forEach(dex => {
      this.metrics.dexStatus[dex] = false;
    });
  }

  /**
   * Start the arbitrage scanner
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('Scanner is already running');
      return;
    }

    console.log('Starting Arbitrage Scanner...');
    this.running = true;

    // Check Jupiter service availability
    if (this.config.jupiter.enabled) {
      const jupiterAvailable = await this.jupiterClient.isServiceAvailable();
      console.log(`Jupiter API status: ${jupiterAvailable ? 'Available' : 'Unavailable'}`);
    }

    // Start the scanning loop
    this.scanInterval = setInterval(async () => {
      await this.performScan();
    }, this.config.priceUpdateInterval);

    // Perform initial scan
    await this.performScan();

    this.emit('status_update', {
      type: ScannerEvent.STATUS_UPDATE,
      data: { status: 'started', metrics: this.metrics },
      timestamp: Date.now()
    });

    console.log('Scanner started successfully');
  }

  /**
   * Stop the arbitrage scanner
   */
  stop(): void {
    if (!this.running) {
      console.log('Scanner is not running');
      return;
    }

    console.log('Stopping Arbitrage Scanner...');
    this.running = false;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    this.emit('status_update', {
      type: ScannerEvent.STATUS_UPDATE,
      data: { status: 'stopped', metrics: this.metrics },
      timestamp: Date.now()
    });

    console.log('Scanner stopped');
  }

  /**
   * Perform a single scan for arbitrage opportunities
   */
  private async performScan(): Promise<void> {
    try {
      this.metrics.totalScans++;
      this.metrics.lastScanTime = Date.now();

      console.log(`Performing scan #${this.metrics.totalScans}...`);

      const opportunities: ArbitrageOpportunity[] = [];

      // Scan each monitored pair
      for (const pairSymbol of this.config.monitoredPairs) {
        const [tokenASymbol, tokenBSymbol] = pairSymbol.split('/');
        const tokenA = getTokenBySymbol(tokenASymbol);
        const tokenB = getTokenBySymbol(tokenBSymbol);

        if (!tokenA || !tokenB) {
          console.warn(`Unknown token in pair: ${pairSymbol}`);
          continue;
        }

        // Get prices from Jupiter (which aggregates multiple DEXes)
        const pairOpportunities = await this.scanPairForArbitrage(tokenA, tokenB);
        opportunities.push(...pairOpportunities);
      }

      // Process found opportunities
      if (opportunities.length > 0) {
        this.metrics.opportunitiesFound += opportunities.length;
        
        // Sort by profit percentage
        opportunities.sort((a, b) => 
          b.profitPercentage.sub(a.profitPercentage).toNumber()
        );

        // Update top opportunity
        if (!this.metrics.topOpportunity || 
            opportunities[0].profitPercentage.gt(this.metrics.topOpportunity.profitPercentage)) {
          this.metrics.topOpportunity = opportunities[0];
        }

        // Update average profit percentage
        const totalProfit = opportunities.reduce(
          (sum, opp) => sum.add(opp.profitPercentage), 
          new Decimal(0)
        );
        this.metrics.averageProfitPercentage = totalProfit.div(opportunities.length);

        // Emit opportunities
        opportunities.forEach(opportunity => {
          if (opportunity.profitPercentage.gte(this.config.minProfitThreshold)) {
            this.emit('opportunity_found', {
              type: ScannerEvent.OPPORTUNITY_FOUND,
              data: opportunity,
              timestamp: Date.now()
            });

            console.log(`🚀 ARBITRAGE OPPORTUNITY FOUND!`);
            console.log(`   Pair: ${opportunity.tokenA.symbol}/${opportunity.tokenB.symbol}`);
            console.log(`   Buy on: ${opportunity.buyDex}`);
            console.log(`   Sell on: ${opportunity.sellDex}`);
            console.log(`   Profit: ${formatTokenAmount(opportunity.profitPercentage, 2)}%`);
            console.log(`   Confidence: ${(opportunity.confidence * 100).toFixed(1)}%`);
          }
        });
      }

    } catch (error) {
      console.error('Error during scan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', {
        type: ScannerEvent.ERROR,
        data: { error: errorMessage },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Scan a specific token pair for arbitrage opportunities
   */
  private async scanPairForArbitrage(
    tokenA: TokenInfo, 
    tokenB: TokenInfo
  ): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    const testAmount = new Decimal(1); // 1 unit of tokenA

    try {
      // Get quotes from Jupiter for both directions
      const forwardRoute = await this.jupiterClient.getBestRoute(
        tokenA, tokenB, testAmount, this.config.maxSlippage * 100
      );

      const reverseRoute = await this.jupiterClient.getBestRoute(
        tokenB, tokenA, testAmount, this.config.maxSlippage * 100
      );

      if (forwardRoute.route && reverseRoute.route) {
        // Calculate arbitrage opportunity
        const forwardPrice = forwardRoute.outputAmount;
        const reversePrice = new Decimal(1).div(reverseRoute.outputAmount);

        const profitPercentage = calculateProfitPercentage(forwardPrice, reversePrice);

        if (profitPercentage.gt(0)) {
          const opportunity: ArbitrageOpportunity = {
            id: `${createPairId(tokenA, tokenB)}-${Date.now()}`,
            tokenA,
            tokenB,
            buyDex: this.extractDexFromRoute(forwardRoute.route),
            sellDex: this.extractDexFromRoute(reverseRoute.route),
            buyPrice: forwardPrice,
            sellPrice: reversePrice,
            profitPercentage,
            estimatedProfit: testAmount.mul(profitPercentage.div(100)),
            route: [], // Would be populated with detailed route info
            timestamp: Date.now(),
            confidence: this.calculateConfidence(forwardRoute.priceImpact, reverseRoute.priceImpact)
          };

          opportunities.push(opportunity);
        }
      }

    } catch (error) {
      console.error(`Error scanning pair ${tokenA.symbol}/${tokenB.symbol}:`, error);
    }

    return opportunities;
  }

  /**
   * Extract DEX name from Jupiter route
   */
  private extractDexFromRoute(route: any): string {
    if (route.routePlan && route.routePlan.length > 0) {
      return route.routePlan[0].swapInfo.label || 'Unknown';
    }
    return 'Jupiter Aggregated';
  }

  /**
   * Calculate confidence score based on price impact and other factors
   */
  private calculateConfidence(priceImpactA: Decimal, priceImpactB: Decimal): number {
    const avgPriceImpact = priceImpactA.add(priceImpactB).div(2);
    
    // Lower price impact = higher confidence
    let confidence = new Decimal(1).sub(avgPriceImpact.div(100));
    
    // Ensure confidence is between 0 and 1
    confidence = Decimal.max(0, Decimal.min(1, confidence));
    
    return confidence.toNumber();
  }

  /**
   * Get current scanner metrics
   */
  getMetrics(): ScannerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cached price data for a pair
   */
  getPriceData(pairId: string): PriceData[] {
    return this.priceCache.get(pairId) || [];
  }

  /**
   * Check if scanner is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ScannerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.rpcEndpoint) {
      this.connection = new Connection(newConfig.rpcEndpoint, 'confirmed');
    }

    if (newConfig.jupiter?.apiEndpoint) {
      this.jupiterClient = new JupiterClient(newConfig.jupiter.apiEndpoint);
    }
  }
} 