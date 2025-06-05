import Decimal from 'decimal.js';
import { OptimizedPriceCollector, DEXPriceMap, TokenPair, DEXPrice } from './optimizedPriceCollector';

export interface ArbitrageOpportunity {
  pair: string;
  buyDex: string;
  sellDex: string;
  buyPrice: Decimal;
  sellPrice: Decimal;
  spread: Decimal;
  spreadPercentage: Decimal;
  estimatedProfit: Decimal;
  estimatedGas: Decimal;
  netProfit: Decimal;
  confidence: number;
  riskScore: number;
  liquidityScore: number;
  priceImpactTotal: Decimal;
  strategy: 'direct_arbitrage' | 'triangular_arbitrage';
  timestamp: number;
  requestId: string;
  responseTimeAdvantage: number; // milliseconds faster than slowest source
  marketEfficiency: number; // 0-1 score
}

export interface ArbitrageAnalysisResult {
  opportunities: ArbitrageOpportunity[];
  priceData: DEXPriceMap;
  analysis: {
    totalOpportunities: number;
    viableOpportunities: number; // After gas costs
    averageSpread: Decimal;
    maxSpread: Decimal;
    marketEfficiency: number;
    dataQuality: number;
    analysisTime: number;
  };
  warnings: string[];
  recommendations: string[];
}

export interface ArbitrageOptions {
  minProfitThreshold: Decimal;
  maxRiskScore: number;
  includeGasCosts: boolean;
  estimatedGasPrice: Decimal;
  maxPriceImpact: Decimal;
  requireLiquidity: boolean;
  enableStatisticalFiltering: boolean;
}

/**
 * Advanced Arbitrage Analyzer
 * Uses optimized price collection and statistical analysis to find real arbitrage opportunities
 */
export class ArbitrageAnalyzer {
  private priceCollector: OptimizedPriceCollector;
  private readonly DEFAULT_GAS_COST = new Decimal(0.005); // 0.005 SOL
  private readonly MIN_LIQUIDITY_THRESHOLD = 100000; // $100k minimum liquidity
  private opportunityHistory: ArbitrageOpportunity[] = [];

  constructor() {
    this.priceCollector = new OptimizedPriceCollector();
  }

  /**
   * Main analysis method: Find arbitrage opportunities for a token pair
   */
  async analyzeArbitrageOpportunities(
    tokenPair: TokenPair,
    options: Partial<ArbitrageOptions> = {}
  ): Promise<ArbitrageAnalysisResult> {
    const startTime = Date.now();
    
    // Set default options
    const opts: ArbitrageOptions = {
      minProfitThreshold: new Decimal(0.001), // 0.1%
      maxRiskScore: 0.7,
      includeGasCosts: true,
      estimatedGasPrice: this.DEFAULT_GAS_COST,
      maxPriceImpact: new Decimal(0.02), // 2%
      requireLiquidity: true,
      enableStatisticalFiltering: true,
      ...options
    };

    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Collect prices from all DEXes in parallel
      const priceData = await this.priceCollector.collectRealPrices(tokenPair, {
        timeout: 5000,
        includeJupiterAggregated: true,
        enableCaching: false // Real-time for arbitrage
      });

      // Analyze data quality
      this.validatePriceData(priceData, warnings);

      // Find arbitrage opportunities
      const opportunities = this.findArbitrageOpportunities(
        priceData, 
        tokenPair, 
        opts,
        warnings
      );

      // Apply statistical filtering
      const filteredOpportunities = opts.enableStatisticalFiltering
        ? this.applyStatisticalFiltering(opportunities, warnings)
        : opportunities;

      // Generate analysis metrics
      const analysis = this.generateAnalysisMetrics(
        filteredOpportunities, 
        priceData, 
        startTime
      );

      // Generate recommendations
      this.generateRecommendations(
        filteredOpportunities, 
        priceData, 
        recommendations
      );

      // Store opportunities for historical analysis
      this.opportunityHistory.push(...filteredOpportunities);
      this.trimOpportunityHistory();

      return {
        opportunities: filteredOpportunities,
        priceData,
        analysis,
        warnings,
        recommendations
      };

    } catch (error) {
      warnings.push(`Analysis failed: ${(error as Error).message}`);
      
      return {
        opportunities: [],
        priceData: { metadata: { totalResponseTime: 0, successfulSources: 0, failedSources: 0, timestamp: Date.now(), requestId: 'error' } },
        analysis: {
          totalOpportunities: 0,
          viableOpportunities: 0,
          averageSpread: new Decimal(0),
          maxSpread: new Decimal(0),
          marketEfficiency: 1,
          dataQuality: 0,
          analysisTime: Date.now() - startTime
        },
        warnings,
        recommendations: ['Fix data collection issues before analyzing arbitrage']
      };
    }
  }

  /**
   * Find direct arbitrage opportunities between DEX pairs
   */
  private findArbitrageOpportunities(
    priceData: DEXPriceMap,
    tokenPair: TokenPair,
    options: ArbitrageOptions,
    warnings: string[]
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    const validPrices: Array<{ dex: string; data: DEXPrice }> = [];

    // Collect valid price data
    Object.entries(priceData).forEach(([dex, price]) => {
      if (dex !== 'metadata' && price && !price.error && price.price.gt(0)) {
        validPrices.push({ dex, data: price });
      }
    });

    if (validPrices.length < 2) {
      warnings.push('Insufficient valid price data for arbitrage analysis');
      return opportunities;
    }

    // Compare all pairs for arbitrage opportunities
    for (let i = 0; i < validPrices.length; i++) {
      for (let j = i + 1; j < validPrices.length; j++) {
        const source1 = validPrices[i];
        const source2 = validPrices[j];

        // Determine buy/sell direction
        const opportunity1 = this.calculateArbitrageOpportunity(
          source1, source2, tokenPair, options, priceData.metadata.requestId
        );
        
        const opportunity2 = this.calculateArbitrageOpportunity(
          source2, source1, tokenPair, options, priceData.metadata.requestId
        );

        // Add viable opportunities
        if (opportunity1 && this.isViableOpportunity(opportunity1, options)) {
          opportunities.push(opportunity1);
        }
        
        if (opportunity2 && this.isViableOpportunity(opportunity2, options)) {
          opportunities.push(opportunity2);
        }
      }
    }

    // Sort by net profit descending
    return opportunities.sort((a, b) => 
      b.netProfit.comparedTo(a.netProfit)
    );
  }

  /**
   * Calculate arbitrage opportunity between two DEXes
   */
  private calculateArbitrageOpportunity(
    buySource: { dex: string; data: DEXPrice },
    sellSource: { dex: string; data: DEXPrice },
    tokenPair: TokenPair,
    options: ArbitrageOptions,
    requestId: string
  ): ArbitrageOpportunity | null {
    
    const buyPrice = buySource.data.price;
    const sellPrice = sellSource.data.price;
    
    // Check if arbitrage is possible (sell > buy)
    if (sellPrice.lte(buyPrice)) {
      return null;
    }

    // Calculate spread
    const spread = sellPrice.sub(buyPrice);
    const spreadPercentage = spread.div(buyPrice);

    // Estimate profit (considering price impact)
    const totalPriceImpact = buySource.data.priceImpact.add(sellSource.data.priceImpact);
    const grossProfit = tokenPair.amount.mul(spread);
    const priceImpactCost = grossProfit.mul(totalPriceImpact);
    const estimatedProfit = grossProfit.sub(priceImpactCost);

    // Calculate gas costs
    const estimatedGas = options.includeGasCosts ? options.estimatedGasPrice : new Decimal(0);
    const netProfit = estimatedProfit.sub(estimatedGas);

    // Calculate confidence and risk scores
    const confidence = this.calculateConfidence(buySource.data, sellSource.data);
    const riskScore = this.calculateRiskScore(
      spreadPercentage, 
      totalPriceImpact, 
      buySource.data, 
      sellSource.data
    );

    // Calculate liquidity score
    const liquidityScore = this.calculateLiquidityScore(buySource.data, sellSource.data);

    // Calculate response time advantage
    const responseTimeAdvantage = this.calculateResponseTimeAdvantage(
      buySource.data, 
      sellSource.data
    );

    // Calculate market efficiency
    const marketEfficiency = this.calculateMarketEfficiency(spreadPercentage);

    return {
      pair: `${tokenPair.from}/${tokenPair.to}`,
      buyDex: buySource.dex,
      sellDex: sellSource.dex,
      buyPrice,
      sellPrice,
      spread,
      spreadPercentage,
      estimatedProfit,
      estimatedGas,
      netProfit,
      confidence,
      riskScore,
      liquidityScore,
      priceImpactTotal: totalPriceImpact,
      strategy: 'direct_arbitrage',
      timestamp: Date.now(),
      requestId,
      responseTimeAdvantage,
      marketEfficiency
    };
  }

  /**
   * Check if opportunity meets viability criteria
   */
  private isViableOpportunity(
    opportunity: ArbitrageOpportunity, 
    options: ArbitrageOptions
  ): boolean {
    // Minimum profit threshold
    if (opportunity.spreadPercentage.lt(options.minProfitThreshold)) {
      return false;
    }

    // Risk score threshold
    if (opportunity.riskScore > options.maxRiskScore) {
      return false;
    }

    // Price impact threshold
    if (opportunity.priceImpactTotal.gt(options.maxPriceImpact)) {
      return false;
    }

    // Net profit must be positive
    if (opportunity.netProfit.lte(0)) {
      return false;
    }

    // Liquidity requirement
    if (options.requireLiquidity && opportunity.liquidityScore < 0.5) {
      return false;
    }

    return true;
  }

  /**
   * Apply statistical filtering to remove noise and false positives
   */
  private applyStatisticalFiltering(
    opportunities: ArbitrageOpportunity[],
    warnings: string[]
  ): ArbitrageOpportunity[] {
    if (opportunities.length === 0) return opportunities;

    // Calculate statistical metrics
    const spreads = opportunities.map(opp => opp.spreadPercentage);
    const mean = spreads.reduce((sum, spread) => sum.add(spread), new Decimal(0))
                     .div(spreads.length);
    
    const variance = spreads.reduce((sum, spread) => {
      const diff = spread.sub(mean);
      return sum.add(diff.mul(diff));
    }, new Decimal(0)).div(spreads.length);
    
    const stdDev = new Decimal(Math.sqrt(variance.toNumber()));

    // Filter outliers (opportunities > 2 standard deviations from mean)
    const threshold = mean.add(stdDev.mul(2));
    const filteredOpportunities = opportunities.filter(opp => {
      const isOutlier = opp.spreadPercentage.gt(threshold);
      
      if (isOutlier && opp.spreadPercentage.gt(0.01)) { // > 1%
        warnings.push(
          `Large spread detected (${opp.spreadPercentage.mul(100).toFixed(3)}%) - ` +
          `likely due to low liquidity or API delays`
        );
      }
      
      return !isOutlier || opp.confidence > 0.8; // Keep high confidence outliers
    });

    // Historical comparison
    if (this.opportunityHistory.length > 50) {
      const historicalMean = this.calculateHistoricalMean();
      
      opportunities.forEach(opp => {
        if (opp.spreadPercentage.gt(historicalMean.mul(3))) {
          warnings.push(
            `Opportunity significantly above historical average - verify data quality`
          );
        }
      });
    }

    return filteredOpportunities;
  }

  /**
   * Calculate confidence score based on multiple factors
   */
  private calculateConfidence(buyPrice: DEXPrice, sellPrice: DEXPrice): number {
    let confidence = 0;

    // Source reliability (Jupiter is most reliable)
    const buyReliability = buyPrice.source === 'aggregator' ? 0.95 : 0.8;
    const sellReliability = sellPrice.source === 'aggregator' ? 0.95 : 0.8;
    confidence += (buyReliability + sellReliability) / 2 * 0.4;

    // Response time (faster = more reliable)
    const avgResponseTime = (buyPrice.responseTime + sellPrice.responseTime) / 2;
    const responseScore = Math.max(0, 1 - avgResponseTime / 2000); // 2s max
    confidence += responseScore * 0.2;

    // Individual confidence scores
    confidence += (buyPrice.confidence + sellPrice.confidence) / 2 * 0.4;

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Calculate risk score (0 = low risk, 1 = high risk)
   */
  private calculateRiskScore(
    spreadPercentage: Decimal,
    priceImpact: Decimal,
    buyPrice: DEXPrice,
    sellPrice: DEXPrice
  ): number {
    let risk = 0;

    // Large spreads are suspicious
    if (spreadPercentage.gt(0.005)) { // > 0.5%
      risk += Math.min(0.4, spreadPercentage.toNumber() * 40);
    }

    // High price impact is risky
    risk += Math.min(0.3, priceImpact.toNumber() * 15);

    // Response time variance increases risk
    const responseTimeDiff = Math.abs(buyPrice.responseTime - sellPrice.responseTime);
    risk += Math.min(0.2, responseTimeDiff / 1000 * 0.2);

    // Low confidence increases risk
    const avgConfidence = (buyPrice.confidence + sellPrice.confidence) / 2;
    risk += (1 - avgConfidence) * 0.1;

    return Math.min(1, Math.max(0, risk));
  }

  /**
   * Calculate liquidity score
   */
  private calculateLiquidityScore(buyPrice: DEXPrice, sellPrice: DEXPrice): number {
    const bothLiquid = buyPrice.liquidityAvailable && sellPrice.liquidityAvailable;
    const bothConfident = buyPrice.confidence > 0.7 && sellPrice.confidence > 0.7;
    
    let score = 0;
    
    if (bothLiquid) score += 0.6;
    if (bothConfident) score += 0.4;
    
    return score;
  }

  /**
   * Calculate response time advantage
   */
  private calculateResponseTimeAdvantage(buyPrice: DEXPrice, sellPrice: DEXPrice): number {
    // Arbitrage advantage decreases with slow response times
    const maxTime = Math.max(buyPrice.responseTime, sellPrice.responseTime);
    return Math.max(0, 2000 - maxTime); // 2 second baseline
  }

  /**
   * Calculate market efficiency (1 = perfectly efficient, 0 = inefficient)
   */
  private calculateMarketEfficiency(spreadPercentage: Decimal): number {
    // Efficient markets have tiny spreads
    const efficiency = Math.max(0, 1 - spreadPercentage.toNumber() * 100);
    return Math.min(1, efficiency);
  }

  /**
   * Validate price data quality
   */
  private validatePriceData(priceData: DEXPriceMap, warnings: string[]): void {
    const { metadata } = priceData;
    
    if (metadata.successfulSources < 2) {
      warnings.push('Insufficient price sources for reliable arbitrage analysis');
    }
    
    if (metadata.totalResponseTime > 3000) {
      warnings.push('Slow response times may affect arbitrage viability');
    }
    
    if (metadata.failedSources > metadata.successfulSources) {
      warnings.push('More failed sources than successful - data quality concerns');
    }
  }

  /**
   * Generate analysis metrics
   */
  private generateAnalysisMetrics(
    opportunities: ArbitrageOpportunity[],
    priceData: DEXPriceMap,
    startTime: number
  ) {
    const viableOpportunities = opportunities.filter(opp => opp.netProfit.gt(0));
    
    const spreads = opportunities.map(opp => opp.spreadPercentage);
    const averageSpread = spreads.length > 0 
      ? spreads.reduce((sum, spread) => sum.add(spread), new Decimal(0)).div(spreads.length)
      : new Decimal(0);
    
    const maxSpread = spreads.length > 0 
      ? spreads.reduce((max, spread) => spread.gt(max) ? spread : max, new Decimal(0))
      : new Decimal(0);

    const marketEfficiency = opportunities.length > 0
      ? opportunities.reduce((sum, opp) => sum + opp.marketEfficiency, 0) / opportunities.length
      : 1;

    const dataQuality = priceData.metadata.successfulSources / 
                       (priceData.metadata.successfulSources + priceData.metadata.failedSources);

    return {
      totalOpportunities: opportunities.length,
      viableOpportunities: viableOpportunities.length,
      averageSpread,
      maxSpread,
      marketEfficiency,
      dataQuality,
      analysisTime: Date.now() - startTime
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    opportunities: ArbitrageOpportunity[],
    priceData: DEXPriceMap,
    recommendations: string[]
  ): void {
    if (opportunities.length === 0) {
      recommendations.push('No arbitrage opportunities found - market appears efficient');
      recommendations.push('Consider monitoring during high volatility periods');
      return;
    }

    const bestOpportunity = opportunities[0];
    
    if (bestOpportunity.netProfit.gt(0)) {
      recommendations.push(
        `Best opportunity: ${bestOpportunity.spreadPercentage.mul(100).toFixed(3)}% spread ` +
        `(${bestOpportunity.buyDex} → ${bestOpportunity.sellDex})`
      );
    }

    if (bestOpportunity.riskScore > 0.5) {
      recommendations.push('High risk detected - verify liquidity and price impact');
    }

    if (priceData.metadata.totalResponseTime > 2000) {
      recommendations.push('Consider optimizing API response times for better arbitrage detection');
    }

    if (opportunities.every(opp => opp.liquidityScore < 0.7)) {
      recommendations.push('Monitor liquidity conditions - current opportunities may be difficult to execute');
    }
  }

  /**
   * Calculate historical mean for comparison
   */
  private calculateHistoricalMean(): Decimal {
    if (this.opportunityHistory.length === 0) return new Decimal(0);
    
    const spreads = this.opportunityHistory.map(opp => opp.spreadPercentage);
    return spreads.reduce((sum, spread) => sum.add(spread), new Decimal(0))
                 .div(spreads.length);
  }

  /**
   * Trim opportunity history to prevent memory growth
   */
  private trimOpportunityHistory(): void {
    const maxHistory = 500;
    if (this.opportunityHistory.length > maxHistory) {
      this.opportunityHistory = this.opportunityHistory.slice(-maxHistory);
    }
  }

  /**
   * Get arbitrage statistics
   */
  public getArbitrageStatistics(): {
    totalOpportunitiesAnalyzed: number;
    averageSpread: Decimal;
    maxSpreadSeen: Decimal;
    successRate: number;
  } {
    if (this.opportunityHistory.length === 0) {
      return {
        totalOpportunitiesAnalyzed: 0,
        averageSpread: new Decimal(0),
        maxSpreadSeen: new Decimal(0),
        successRate: 0
      };
    }

    const spreads = this.opportunityHistory.map(opp => opp.spreadPercentage);
    const viableCount = this.opportunityHistory.filter(opp => opp.netProfit.gt(0)).length;

    return {
      totalOpportunitiesAnalyzed: this.opportunityHistory.length,
      averageSpread: spreads.reduce((sum, spread) => sum.add(spread), new Decimal(0))
                           .div(spreads.length),
      maxSpreadSeen: spreads.reduce((max, spread) => spread.gt(max) ? spread : max, new Decimal(0)),
      successRate: viableCount / this.opportunityHistory.length
    };
  }
} 