import { PublicKey } from '@solana/web3.js';
import Decimal from 'decimal.js';
import { TokenInfo } from '../types';

// Common token addresses on Solana - expanded list with many tokens
export const KNOWN_TOKENS: Record<string, TokenInfo> = {
  SOL: {
    mint: new PublicKey('So11111111111111111111111111111111111111112'),
    symbol: 'SOL',
    decimals: 9,
    name: 'Solana'
  },
  USDC: {
    mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin'
  },
  USDT: {
    mint: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
    symbol: 'USDT',
    decimals: 6,
    name: 'Tether USD'
  },
  RAY: {
    mint: new PublicKey('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'),
    symbol: 'RAY',
    decimals: 6,
    name: 'Raydium'
  },
  ORCA: {
    mint: new PublicKey('orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE'),
    symbol: 'ORCA',
    decimals: 6,
    name: 'Orca'
  },
  JUP: {
    mint: new PublicKey('JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'),
    symbol: 'JUP',
    decimals: 6,
    name: 'Jupiter'
  },
  // Popular DeFi tokens
  BONK: {
    mint: new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'),
    symbol: 'BONK',
    decimals: 5,
    name: 'Bonk'
  },
  STEP: {
    mint: new PublicKey('StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT'),
    symbol: 'STEP',
    decimals: 9,
    name: 'Step Finance'
  },
  SAMO: {
    mint: new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'),
    symbol: 'SAMO',
    decimals: 9,
    name: 'Samoyed Coin'
  },
  FIDA: {
    mint: new PublicKey('EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp'),
    symbol: 'FIDA',
    decimals: 6,
    name: 'Bonfida'
  },
  SRM: {
    mint: new PublicKey('SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt'),
    symbol: 'SRM',
    decimals: 6,
    name: 'Serum'
  },
  MER: {
    mint: new PublicKey('MERt85fc5boKw3BW1eYdxonEuJNvXbiMbs6M8zPzK6a'),
    symbol: 'MER',
    decimals: 6,
    name: 'Mercurial Finance'
  },
  PORT: {
    mint: new PublicKey('PoRTjZMPXb9T7dyU7tpLEZRQj7e6ssfAE62j2oQuc6y'),
    symbol: 'PORT',
    decimals: 6,
    name: 'Port Finance'
  },
  COPE: {
    mint: new PublicKey('8HGyAAB1yoM1ttS7pXjHMa3dukTFGQggnFFH3hJZgzQh'),
    symbol: 'COPE',
    decimals: 6,
    name: 'Cope'
  },
  ATLAS: {
    mint: new PublicKey('ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx'),
    symbol: 'ATLAS',
    decimals: 8,
    name: 'Star Atlas'
  },
  POLIS: {
    mint: new PublicKey('poLisWXnNRwC6oBu1vHiuKQzFjGL4XDSu4g9qjz9qVk'),
    symbol: 'POLIS',
    decimals: 8,
    name: 'Star Atlas DAO'
  },
  // Meme tokens (often have high volatility and arbitrage opportunities)
  WIF: {
    mint: new PublicKey('EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'),
    symbol: 'WIF',
    decimals: 6,
    name: 'dogwifhat'
  },
  MYRO: {
    mint: new PublicKey('HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4'),
    symbol: 'MYRO',
    decimals: 9,
    name: 'Myro'
  },
  POPCAT: {
    mint: new PublicKey('7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr'),
    symbol: 'POPCAT',
    decimals: 9,
    name: 'Popcat'
  },
  SLERF: {
    mint: new PublicKey('7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3'),
    symbol: 'SLERF',
    decimals: 9,
    name: 'Slerf'
  },
  // Gaming tokens
  GMT: {
    mint: new PublicKey('7i5KKsX2weiTkry7jA4ZwSuXGhs5eJBEjY8vVxR4pfRx'),
    symbol: 'GMT',
    decimals: 9,
    name: 'STEPN'
  },
  GST: {
    mint: new PublicKey('AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB'),
    symbol: 'GST',
    decimals: 9,
    name: 'Green Satoshi Token'
  },
  DFL: {
    mint: new PublicKey('DFL1zNkaGPWm1BqAVqRjCZvHmwTFrEaJtbzJWgseoNJh'),
    symbol: 'DFL',
    decimals: 9,
    name: 'DeFi Land'
  },
  // Infrastructure tokens
  MNGO: {
    mint: new PublicKey('MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac'),
    symbol: 'MNGO',
    decimals: 6,
    name: 'Mango'
  },
  MEDIA: {
    mint: new PublicKey('ETAtLmCmsoiEEKfNrHKJ2kYy3MoABhU6NQvpSfij5tDs'),
    symbol: 'MEDIA',
    decimals: 6,
    name: 'Media Network'
  },
  MAPS: {
    mint: new PublicKey('MAPS41MDahZ9QdKXhVa4dWB9RuyfV4XqhyAZ8XcYepb'),
    symbol: 'MAPS',
    decimals: 6,
    name: 'Maps.me'
  },
  OXY: {
    mint: new PublicKey('z3dn17yLaGMKffVogeFHQ9zWVcXgqgf3PQnDsNs2g6M'),
    symbol: 'OXY',
    decimals: 6,
    name: 'Oxygen'
  },
  // Yield farming tokens
  TULIP: {
    mint: new PublicKey('TuLipcqtGVXP9XR62wM8WWCm6a9vhLs7T1uoWBk6FDs'),
    symbol: 'TULIP',
    decimals: 6,
    name: 'Tulip Protocol'
  },
  SUNNY: {
    mint: new PublicKey('SUNNYWgPQmFxe9wTZzNK7iPnJ3vYDrkgnxJRJm1s3ag'),
    symbol: 'SUNNY',
    decimals: 6,
    name: 'Sunny Aggregator'
  },
  // Stablecoins and wrapped tokens
  USDC_POS: {
    mint: new PublicKey('2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk'),
    symbol: 'USDC.e',
    decimals: 6,
    name: 'USD Coin (Portal from Ethereum)'
  },
  BTC: {
    mint: new PublicKey('9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E'),
    symbol: 'BTC',
    decimals: 6,
    name: 'Bitcoin (Portal)'
  },
  ETH: {
    mint: new PublicKey('7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs'),
    symbol: 'ETH',
    decimals: 8,
    name: 'Ethereum (Portal)'
  },
  AVAX: {
    mint: new PublicKey('KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS'),
    symbol: 'AVAX',
    decimals: 9,
    name: 'Avalanche (Portal)'
  },
  FTT: {
    mint: new PublicKey('AGFEad2et2ZJif9jaGpdMixQqvW5i81aBdvKe7PHNfz3'),
    symbol: 'FTT',
    decimals: 6,
    name: 'FTX Token (Portal)'
  },
  // Less common but active tokens
  SLND: {
    mint: new PublicKey('SLNDpmoWTVADgEdndyvWzroNL7zSi1dF9PC3xHGtPwp'),
    symbol: 'SLND',
    decimals: 6,
    name: 'Solend'
  },
  LARIX: {
    mint: new PublicKey('Lrxqnh6ZHKbGy3dcrCED43nsoLkM1LTzU2jRfWe8qUC'),
    symbol: 'LARIX',
    decimals: 6,
    name: 'Larix'
  },
  GENE: {
    mint: new PublicKey('GENEtH5amGSi8kHAtQoezp1XEXwZJ8vcuePYnXdKrMYz'),
    symbol: 'GENE',
    decimals: 9,
    name: 'Genopets'
  },
  NINJA: {
    mint: new PublicKey('FgX1WD9WzMU3yLdXaHiAZqQqTtTYNwNJXNWzSvkCvJ3K'),
    symbol: 'NINJA',
    decimals: 6,
    name: 'Ninja Protocol'
  },
  SONAR: {
    mint: new PublicKey('sonarX4VtVkQemriJeLm6CKeW3GDMyiBnnAEMw1MRAE'),
    symbol: 'SONAR',
    decimals: 9,
    name: 'Sonar'
  }
};

/**
 * Get token info by mint address
 */
export function getTokenByMint(mint: PublicKey): TokenInfo | undefined {
  const mintString = mint.toString();
  return Object.values(KNOWN_TOKENS).find(token => 
    token.mint.toString() === mintString
  );
}

/**
 * Get token info by symbol
 */
export function getTokenBySymbol(symbol: string): TokenInfo | undefined {
  return KNOWN_TOKENS[symbol.toUpperCase()];
}

/**
 * Convert raw token amount to decimal format
 */
export function fromRawAmount(amount: string | number, decimals: number): Decimal {
  return new Decimal(amount).div(new Decimal(10).pow(decimals));
}

/**
 * Convert decimal amount to raw token format
 */
export function toRawAmount(amount: Decimal, decimals: number): string {
  return amount.mul(new Decimal(10).pow(decimals)).floor().toString();
}

/**
 * Calculate price impact for a swap
 */
export function calculatePriceImpact(
  inputAmount: Decimal,
  outputAmount: Decimal,
  marketPrice: Decimal
): Decimal {
  const executionPrice = inputAmount.div(outputAmount);
  const priceImpact = executionPrice.sub(marketPrice).div(marketPrice).abs();
  return priceImpact.mul(100); // Convert to percentage
}

/**
 * Calculate arbitrage profit percentage
 */
export function calculateProfitPercentage(
  buyPrice: Decimal,
  sellPrice: Decimal
): Decimal {
  return sellPrice.sub(buyPrice).div(buyPrice).mul(100);
}

/**
 * Check if two tokens form a valid pair
 */
export function isValidPair(tokenA: TokenInfo, tokenB: TokenInfo): boolean {
  return !tokenA.mint.equals(tokenB.mint);
}

/**
 * Create a unique pair identifier
 */
export function createPairId(tokenA: TokenInfo, tokenB: TokenInfo): string {
  const mintA = tokenA.mint.toString();
  const mintB = tokenB.mint.toString();
  
  // Sort to ensure consistent pair ID regardless of order
  const [first, second] = mintA < mintB ? [mintA, mintB] : [mintB, mintA];
  return `${first}-${second}`;
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: Decimal, decimals: number = 6): string {
  return amount.toFixed(decimals);
}

/**
 * Format price for display
 */
export function formatPrice(price: Decimal, decimals: number = 8): string {
  return price.toFixed(decimals);
}

/**
 * Calculate slippage-adjusted amount
 */
export function calculateSlippageAmount(
  amount: Decimal,
  slippagePercent: number,
  isMinimum: boolean = true
): Decimal {
  const slippageMultiplier = isMinimum 
    ? new Decimal(1).sub(new Decimal(slippagePercent).div(100))
    : new Decimal(1).add(new Decimal(slippagePercent).div(100));
  
  return amount.mul(slippageMultiplier);
} 