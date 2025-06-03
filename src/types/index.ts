import { PublicKey } from '@solana/web3.js';
import Decimal from 'decimal.js';

export interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  decimals: number;
  name?: string;
}

export interface PriceData {
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  price: Decimal;
  timestamp: number;
  dex: string;
  poolAddress: PublicKey;
  liquidity?: Decimal;
  volume24h?: Decimal;
}

export interface PoolState {
  address: PublicKey;
  dex: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  reserveA: Decimal;
  reserveB: Decimal;
  liquidity: Decimal;
  fee: Decimal;
  lastUpdate: number;
}

export interface ArbitrageOpportunity {
  id: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  buyDex: string;
  sellDex: string;
  buyPrice: Decimal;
  sellPrice: Decimal;
  profitPercentage: Decimal;
  estimatedProfit: Decimal;
  route: RouteInfo[];
  timestamp: number;
  confidence: number; // 0-1 scale
}

export interface RouteInfo {
  dex: string;
  poolAddress: PublicKey;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: Decimal;
  amountOut: Decimal;
  priceImpact: Decimal;
}

export interface JupiterRoute {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: any;
  priceImpactPct: string;
  routePlan: JupiterRoutePlan[];
}

export interface JupiterRoutePlan {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
}

export interface ScannerMetrics {
  totalScans: number;
  opportunitiesFound: number;
  averageProfitPercentage: Decimal;
  topOpportunity: ArbitrageOpportunity | null;
  lastScanTime: number;
  dexStatus: Record<string, boolean>;
}

export enum ScannerEvent {
  OPPORTUNITY_FOUND = 'opportunity_found',
  PRICE_UPDATE = 'price_update',
  POOL_UPDATE = 'pool_update',
  ERROR = 'error',
  STATUS_UPDATE = 'status_update'
}

export interface ScannerEventData {
  type: ScannerEvent;
  data: any;
  timestamp: number;
} 