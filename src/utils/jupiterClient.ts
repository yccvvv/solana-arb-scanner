import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import Decimal from 'decimal.js';
import { JupiterRoute, TokenInfo } from '../types';
import { toRawAmount } from './tokenUtils';

export class JupiterClient {
  private apiEndpoint: string;

  constructor(apiEndpoint: string = 'https://quote-api.jup.ag/v6') {
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Get quote for a token swap
   */
  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: Decimal,
    inputDecimals: number,
    slippageBps: number = 50
  ): Promise<JupiterRoute | null> {
    try {
      const amountRaw = toRawAmount(amount, inputDecimals);
      
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amountRaw,
        slippageBps: slippageBps.toString(),
        onlyDirectRoutes: 'false',
        asLegacyTransaction: 'false'
      });

      const response = await axios.get(`${this.apiEndpoint}/quote?${params}`);
      
      if (response.data && response.data.routePlan) {
        return response.data as JupiterRoute;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching Jupiter quote:', error);
      return null;
    }
  }

  /**
   * Get multiple quotes for different amounts to analyze price impact
   */
  async getMultipleQuotes(
    inputMint: string,
    outputMint: string,
    amounts: Decimal[],
    inputDecimals: number,
    slippageBps: number = 50
  ): Promise<JupiterRoute[]> {
    const promises = amounts.map(amount => 
      this.getQuote(inputMint, outputMint, amount, inputDecimals, slippageBps)
    );

    const results = await Promise.allSettled(promises);
    
    return results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<JupiterRoute>).value);
  }

  /**
   * Get best route between two tokens considering all available DEXes
   */
  async getBestRoute(
    tokenA: TokenInfo,
    tokenB: TokenInfo,
    amount: Decimal,
    slippageBps: number = 50
  ): Promise<{
    route: JupiterRoute | null;
    outputAmount: Decimal;
    priceImpact: Decimal;
  }> {
    const route = await this.getQuote(
      tokenA.mint.toString(),
      tokenB.mint.toString(),
      amount,
      tokenA.decimals,
      slippageBps
    );

    if (!route) {
      return {
        route: null,
        outputAmount: new Decimal(0),
        priceImpact: new Decimal(0)
      };
    }

    const outputAmount = new Decimal(route.outAmount).div(
      new Decimal(10).pow(tokenB.decimals)
    );

    const priceImpact = new Decimal(route.priceImpactPct);

    return {
      route,
      outputAmount,
      priceImpact
    };
  }

  /**
   * Check if a direct route exists between two tokens
   */
  async hasDirectRoute(tokenA: TokenInfo, tokenB: TokenInfo): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        inputMint: tokenA.mint.toString(),
        outputMint: tokenB.mint.toString(),
        amount: toRawAmount(new Decimal(1), tokenA.decimals),
        onlyDirectRoutes: 'true'
      });

      const response = await axios.get(`${this.apiEndpoint}/quote?${params}`);
      return response.data && response.data.routePlan && response.data.routePlan.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get all available tokens from Jupiter
   */
  async getTokenList(): Promise<TokenInfo[]> {
    try {
      const response = await axios.get(`${this.apiEndpoint}/tokens`);
      
      return response.data.map((token: any) => ({
        mint: new PublicKey(token.address),
        symbol: token.symbol,
        decimals: token.decimals,
        name: token.name
      }));
    } catch (error) {
      console.error('Error fetching Jupiter token list:', error);
      return [];
    }
  }

  /**
   * Calculate effective price from Jupiter route
   */
  calculateEffectivePrice(
    route: JupiterRoute,
    tokenADecimals: number,
    tokenBDecimals: number
  ): Decimal {
    const inputAmount = new Decimal(route.inAmount).div(
      new Decimal(10).pow(tokenADecimals)
    );
    const outputAmount = new Decimal(route.outAmount).div(
      new Decimal(10).pow(tokenBDecimals)
    );

    return outputAmount.div(inputAmount);
  }

  /**
   * Check if Jupiter service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiEndpoint}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Get quotes specifically targeting certain DEXes by using direct routes
   */
  async getDexSpecificQuotes(
    inputMint: string,
    outputMint: string,
    amount: Decimal,
    inputDecimals: number,
    slippageBps: number = 50
  ): Promise<JupiterRoute[]> {
    const routes: JupiterRoute[] = [];
    
    try {
      const amountRaw = toRawAmount(amount, inputDecimals);
      
      // Try direct routes first (more likely to hit specific DEXes)
      const directParams = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amountRaw,
        slippageBps: slippageBps.toString(),
        onlyDirectRoutes: 'true',
        asLegacyTransaction: 'false'
      });

      const directResponse = await axios.get(`${this.apiEndpoint}/quote?${directParams}`);
      if (directResponse.data && directResponse.data.routePlan) {
        routes.push(directResponse.data as JupiterRoute);
      }

      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 300));

      // Try with different slippage for more route variety
      const highSlippageParams = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amountRaw,
        slippageBps: (slippageBps * 2).toString(),
        onlyDirectRoutes: 'false',
        asLegacyTransaction: 'false'
      });

      const highSlippageResponse = await axios.get(`${this.apiEndpoint}/quote?${highSlippageParams}`);
      if (highSlippageResponse.data && highSlippageResponse.data.routePlan) {
        routes.push(highSlippageResponse.data as JupiterRoute);
      }

    } catch (error) {
      console.error('Error fetching DEX-specific quotes:', error);
    }

    return routes;
  }

  /**
   * Extract unique DEX routes from Jupiter response
   */
  extractDexRoutes(route: JupiterRoute): Array<{dex: string, route: any, percentage: number}> {
    const dexRoutes: Array<{dex: string, route: any, percentage: number}> = [];
    
    if (route.routePlan) {
      route.routePlan.forEach(plan => {
        const dexName = this.extractDexName(plan.swapInfo.label);
        dexRoutes.push({
          dex: dexName,
          route: plan,
          percentage: plan.percent
        });
      });
    }
    
    return dexRoutes;
  }

  /**
   * Extract DEX name from Jupiter route label
   */
  private extractDexName(label: string): string {
    const lowerLabel = label.toLowerCase();
    
    if (lowerLabel.includes('raydium')) return 'Raydium';
    if (lowerLabel.includes('orca')) return 'Orca';
    if (lowerLabel.includes('meteora')) return 'Meteora';
    if (lowerLabel.includes('phoenix')) return 'Phoenix';
    if (lowerLabel.includes('aldrin')) return 'Aldrin';
    if (lowerLabel.includes('saber')) return 'Saber';
    if (lowerLabel.includes('mercurial')) return 'Mercurial';
    if (lowerLabel.includes('serum')) return 'Serum';
    if (lowerLabel.includes('openbook')) return 'OpenBook';
    
    return label; // Return original if no match
  }
} 