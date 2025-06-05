import Decimal from 'decimal.js';
import axios from 'axios';
import { JupiterClient } from './jupiterClient';
import { getTokenBySymbol } from './tokenUtils';

// Types and interfaces
export interface TokenPair {
  from: string;
  to: string;
  amount: Decimal;
  fromMint?: string;
  toMint?: string;
  fromDecimals?: number;
  toDecimals?: number;
}

export interface DEXPrice {
  dex: string;
  price: Decimal;
  outputAmount: Decimal;
  inputAmount: Decimal;
  priceImpact: Decimal;
  liquidityAvailable: boolean;
  source: 'direct' | 'aggregator';
  responseTime: number;
  confidence: number;
  timestamp: number;
  error?: string;
}

export interface DEXPriceMap {
  raydium?: DEXPrice;
  orca?: DEXPrice;
  phoenix?: DEXPrice;
  jupiter?: DEXPrice;
  metadata: {
    totalResponseTime: number;
    successfulSources: number;
    failedSources: number;
    timestamp: number;
    requestId: string;
  };
}

export interface PriceCollectionOptions {
  timeout?: number;
  retries?: number;
  includeJupiterAggregated?: boolean;
  includePriceImpact?: boolean;
  enableCaching?: boolean;
  cacheExpiryMs?: number;
}

/**
 * Optimized Price Collector for Solana DEXes
 * Implements parallel price collection with error handling and consolidation
 */
export class OptimizedPriceCollector {
  private jupiterClient: JupiterClient;
  private priceCache: Map<string, { price: DEXPrice; expiry: number }>;
  private requestCounter: number = 0;

  constructor() {
    this.jupiterClient = new JupiterClient();
    this.priceCache = new Map();
  }

  /**
   * Main method: Collect prices from multiple DEX sources in parallel
   */
  async collectRealPrices(
    tokenPair: TokenPair, 
    options: PriceCollectionOptions = {}
  ): Promise<DEXPriceMap> {
    const startTime = Date.now();
    const requestId = `req_${++this.requestCounter}_${startTime}`;
    
    // Set default options
    const opts = {
      timeout: 5000,
      retries: 2,
      includeJupiterAggregated: true,
      includePriceImpact: true,
      enableCaching: false,
      cacheExpiryMs: 10000,
      ...options
    };

    // Prepare token pair data
    const preparedPair = await this.prepareTokenPair(tokenPair);
    if (!preparedPair) {
      throw new Error(`Invalid token pair: ${tokenPair.from}/${tokenPair.to}`);
    }

    // Parallel price collection with Promise.allSettled for fault tolerance
    const pricePromises = [
      this.getRaydiumPrice(preparedPair, opts, requestId),
      this.getOrcaPrice(preparedPair, opts, requestId),
      this.getPhoenixPrice(preparedPair, opts, requestId)
    ];

    // Optionally include Jupiter aggregated price
    if (opts.includeJupiterAggregated) {
      pricePromises.push(
        this.getJupiterAggregatedPrice(preparedPair, opts, requestId)
      );
    }

    // Execute all price fetches in parallel
    const results = await Promise.allSettled(pricePromises);
    
    // Consolidate results
    return this.consolidatePrices(results, startTime, requestId);
  }

  /**
   * Prepare token pair with mint addresses and decimals
   */
  private async prepareTokenPair(pair: TokenPair): Promise<TokenPair | null> {
    try {
      const fromToken = getTokenBySymbol(pair.from);
      const toToken = getTokenBySymbol(pair.to);

      if (!fromToken || !toToken) {
        return null;
      }

      return {
        ...pair,
        fromMint: fromToken.mint.toString(),
        toMint: toToken.mint.toString(),
        fromDecimals: fromToken.decimals,
        toDecimals: toToken.decimals
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetch price from Raydium DEX
   */
  private async getRaydiumPrice(
    tokenPair: TokenPair, 
    options: PriceCollectionOptions,
    requestId: string
  ): Promise<DEXPrice> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (options.enableCaching) {
        const cached = this.getCachedPrice('raydium', tokenPair);
        if (cached) return cached;
      }

      // Simulate Raydium API call (replace with actual Raydium integration)
      const response = await this.callWithTimeout(
        this.simulateRaydiumAPI(tokenPair),
        options.timeout || 5000
      );

      const price = this.calculateEffectivePrice(
        response.outputAmount,
        tokenPair.amount,
        tokenPair.toDecimals || 6
      );

      const dexPrice: DEXPrice = {
        dex: 'Raydium',
        price,
        outputAmount: new Decimal(response.outputAmount),
        inputAmount: tokenPair.amount,
        priceImpact: new Decimal(response.priceImpact || 0),
        liquidityAvailable: response.liquidity > 0,
        source: 'direct',
        responseTime: Date.now() - startTime,
        confidence: this.calculateConfidence(price, response.liquidity),
        timestamp: Date.now()
      };

      // Cache if enabled
      if (options.enableCaching) {
        this.setCachedPrice('raydium', tokenPair, dexPrice, options.cacheExpiryMs || 10000);
      }

      return dexPrice;
    } catch (error) {
      return this.createErrorPrice('Raydium', tokenPair, startTime, error as Error);
    }
  }

  /**
   * Fetch price from Orca DEX
   */
  private async getOrcaPrice(
    tokenPair: TokenPair, 
    options: PriceCollectionOptions,
    requestId: string
  ): Promise<DEXPrice> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (options.enableCaching) {
        const cached = this.getCachedPrice('orca', tokenPair);
        if (cached) return cached;
      }

      // Simulate Orca API call (replace with actual Orca integration)
      const response = await this.callWithTimeout(
        this.simulateOrcaAPI(tokenPair),
        options.timeout || 5000
      );

      const price = this.calculateEffectivePrice(
        response.outputAmount,
        tokenPair.amount,
        tokenPair.toDecimals || 6
      );

      const dexPrice: DEXPrice = {
        dex: 'Orca',
        price,
        outputAmount: new Decimal(response.outputAmount),
        inputAmount: tokenPair.amount,
        priceImpact: new Decimal(response.priceImpact || 0),
        liquidityAvailable: response.liquidity > 0,
        source: 'direct',
        responseTime: Date.now() - startTime,
        confidence: this.calculateConfidence(price, response.liquidity),
        timestamp: Date.now()
      };

      // Cache if enabled
      if (options.enableCaching) {
        this.setCachedPrice('orca', tokenPair, dexPrice, options.cacheExpiryMs || 10000);
      }

      return dexPrice;
    } catch (error) {
      return this.createErrorPrice('Orca', tokenPair, startTime, error as Error);
    }
  }

  /**
   * Fetch price from Phoenix DEX
   */
  private async getPhoenixPrice(
    tokenPair: TokenPair, 
    options: PriceCollectionOptions,
    requestId: string
  ): Promise<DEXPrice> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (options.enableCaching) {
        const cached = this.getCachedPrice('phoenix', tokenPair);
        if (cached) return cached;
      }

      // Simulate Phoenix API call (replace with actual Phoenix integration)
      const response = await this.callWithTimeout(
        this.simulatePhoenixAPI(tokenPair),
        options.timeout || 5000
      );

      const price = this.calculateEffectivePrice(
        response.outputAmount,
        tokenPair.amount,
        tokenPair.toDecimals || 6
      );

      const dexPrice: DEXPrice = {
        dex: 'Phoenix',
        price,
        outputAmount: new Decimal(response.outputAmount),
        inputAmount: tokenPair.amount,
        priceImpact: new Decimal(response.priceImpact || 0),
        liquidityAvailable: response.liquidity > 0,
        source: 'direct',
        responseTime: Date.now() - startTime,
        confidence: this.calculateConfidence(price, response.liquidity),
        timestamp: Date.now()
      };

      // Cache if enabled
      if (options.enableCaching) {
        this.setCachedPrice('phoenix', tokenPair, dexPrice, options.cacheExpiryMs || 10000);
      }

      return dexPrice;
    } catch (error) {
      return this.createErrorPrice('Phoenix', tokenPair, startTime, error as Error);
    }
  }

  /**
   * Fetch aggregated price from Jupiter
   */
  private async getJupiterAggregatedPrice(
    tokenPair: TokenPair, 
    options: PriceCollectionOptions,
    requestId: string
  ): Promise<DEXPrice> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (options.enableCaching) {
        const cached = this.getCachedPrice('jupiter', tokenPair);
        if (cached) return cached;
      }

      if (!tokenPair.fromMint || !tokenPair.toMint || !tokenPair.fromDecimals) {
        throw new Error('Missing token information for Jupiter call');
      }

      const quote = await this.jupiterClient.getQuote(
        tokenPair.fromMint,
        tokenPair.toMint,
        tokenPair.amount,
        tokenPair.fromDecimals,
        50 // 0.5% slippage
      );

      if (!quote) {
        throw new Error('Jupiter quote failed');
      }

      const price = this.jupiterClient.calculateEffectivePrice(
        quote,
        tokenPair.fromDecimals,
        tokenPair.toDecimals || 6
      );

      const dexPrice: DEXPrice = {
        dex: 'Jupiter',
        price,
        outputAmount: new Decimal(quote.outAmount),
        inputAmount: new Decimal(quote.inAmount),
        priceImpact: new Decimal(quote.priceImpactPct || 0),
        liquidityAvailable: true,
        source: 'aggregator',
        responseTime: Date.now() - startTime,
        confidence: 0.95, // Jupiter is generally very reliable
        timestamp: Date.now()
      };

      // Cache if enabled
      if (options.enableCaching) {
        this.setCachedPrice('jupiter', tokenPair, dexPrice, options.cacheExpiryMs || 10000);
      }

      return dexPrice;
    } catch (error) {
      return this.createErrorPrice('Jupiter', tokenPair, startTime, error as Error);
    }
  }

  /**
   * Consolidate prices from all sources with metadata
   */
  private consolidatePrices(
    results: PromiseSettledResult<DEXPrice>[],
    startTime: number,
    requestId: string
  ): DEXPriceMap {
    const consolidatedPrices: DEXPriceMap = {
      metadata: {
        totalResponseTime: Date.now() - startTime,
        successfulSources: 0,
        failedSources: 0,
        timestamp: Date.now(),
        requestId
      }
    };

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const dexPrice = result.value;
        
        if (!dexPrice.error) {
          consolidatedPrices.metadata.successfulSources++;
        } else {
          consolidatedPrices.metadata.failedSources++;
        }

        // Map results to DEX names
        switch (index) {
          case 0: consolidatedPrices.raydium = dexPrice; break;
          case 1: consolidatedPrices.orca = dexPrice; break;
          case 2: consolidatedPrices.phoenix = dexPrice; break;
          case 3: consolidatedPrices.jupiter = dexPrice; break;
        }
      } else {
        consolidatedPrices.metadata.failedSources++;
      }
    });

    return consolidatedPrices;
  }

  /**
   * Simulate Raydium API call (replace with actual implementation)
   */
  private async simulateRaydiumAPI(tokenPair: TokenPair): Promise<any> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    // Generate realistic response
    const basePrice = 185.5; // SOL/USDC reference price
    const variation = (Math.random() - 0.5) * 0.01; // ±0.5% variation
    const outputAmount = tokenPair.amount.mul(basePrice * (1 + variation));
    
    return {
      outputAmount: outputAmount.toString(),
      priceImpact: Math.random() * 0.005, // 0-0.5% impact
      liquidity: 1000000 + Math.random() * 9000000, // 1-10M liquidity
      fees: 0.0025 // 0.25% fee
    };
  }

  /**
   * Simulate Orca API call (replace with actual implementation)
   */
  private async simulateOrcaAPI(tokenPair: TokenPair): Promise<any> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 40 + Math.random() * 80));
    
    const basePrice = 185.5;
    const variation = (Math.random() - 0.5) * 0.008; // ±0.4% variation
    const outputAmount = tokenPair.amount.mul(basePrice * (1 + variation));
    
    return {
      outputAmount: outputAmount.toString(),
      priceImpact: Math.random() * 0.004,
      liquidity: 800000 + Math.random() * 7000000,
      fees: 0.003 // 0.3% fee
    };
  }

  /**
   * Simulate Phoenix API call (replace with actual implementation)
   */
  private async simulatePhoenixAPI(tokenPair: TokenPair): Promise<any> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 60 + Math.random() * 120));
    
    const basePrice = 185.5;
    const variation = (Math.random() - 0.5) * 0.012; // ±0.6% variation
    const outputAmount = tokenPair.amount.mul(basePrice * (1 + variation));
    
    return {
      outputAmount: outputAmount.toString(),
      priceImpact: Math.random() * 0.008,
      liquidity: 500000 + Math.random() * 5000000,
      fees: 0.002 // 0.2% fee
    };
  }

  /**
   * Calculate effective price from output amount
   */
  private calculateEffectivePrice(
    outputAmount: string, 
    inputAmount: Decimal, 
    outputDecimals: number
  ): Decimal {
    const output = new Decimal(outputAmount).div(new Decimal(10).pow(outputDecimals));
    return output.div(inputAmount);
  }

  /**
   * Calculate confidence score based on price and liquidity
   */
  private calculateConfidence(price: Decimal, liquidity: number): number {
    const liquidityScore = Math.min(liquidity / 10000000, 1); // Normalize to 0-1
    const priceStability = price.gt(0) ? 1 : 0;
    return (liquidityScore * 0.7 + priceStability * 0.3);
  }

  /**
   * Create error price object
   */
  private createErrorPrice(
    dex: string, 
    tokenPair: TokenPair, 
    startTime: number, 
    error: Error
  ): DEXPrice {
    return {
      dex,
      price: new Decimal(0),
      outputAmount: new Decimal(0),
      inputAmount: tokenPair.amount,
      priceImpact: new Decimal(0),
      liquidityAvailable: false,
      source: 'direct',
      responseTime: Date.now() - startTime,
      confidence: 0,
      timestamp: Date.now(),
      error: error.message
    };
  }

  /**
   * Utility: Call function with timeout
   */
  private async callWithTimeout<T>(
    promise: Promise<T>, 
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Cache management methods
   */
  private getCachedPrice(dex: string, tokenPair: TokenPair): DEXPrice | null {
    const key = `${dex}_${tokenPair.from}_${tokenPair.to}_${tokenPair.amount.toString()}`;
    const cached = this.priceCache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return { ...cached.price, timestamp: Date.now() };
    }
    
    return null;
  }

  private setCachedPrice(
    dex: string, 
    tokenPair: TokenPair, 
    price: DEXPrice, 
    expiryMs: number
  ): void {
    const key = `${dex}_${tokenPair.from}_${tokenPair.to}_${tokenPair.amount.toString()}`;
    this.priceCache.set(key, {
      price,
      expiry: Date.now() + expiryMs
    });
  }

  /**
   * Clear expired cache entries
   */
  public clearExpiredCache(): number {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, value] of this.priceCache.entries()) {
      if (value.expiry <= now) {
        this.priceCache.delete(key);
        cleared++;
      }
    }
    
    return cleared;
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; expired: number } {
    const now = Date.now();
    let expired = 0;
    
    for (const value of this.priceCache.values()) {
      if (value.expiry <= now) expired++;
    }
    
    return {
      size: this.priceCache.size,
      expired
    };
  }
} 