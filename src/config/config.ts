import { PublicKey } from '@solana/web3.js';

export interface DexConfig {
  name: string;
  enabled: boolean;
  endpoint?: string;
  programId?: PublicKey;
}

export interface ScannerConfig {
  // RPC Configuration
  rpcEndpoint: string;
  rpcWsEndpoint: string;
  
  // Scanning intervals (in milliseconds)
  priceUpdateInterval: number;
  poolStateUpdateInterval: number;
  
  // Minimum arbitrage threshold (in percentage)
  minProfitThreshold: number;
  
  // Maximum slippage tolerance
  maxSlippage: number;
  
  // DEX configurations
  dexes: {
    raydium: DexConfig;
    orca: DexConfig;
    meteora: DexConfig;
    phoenix: DexConfig;
  };
  
  // Token pairs to monitor
  monitoredPairs: string[];
  
  // Jupiter API configuration
  jupiter: {
    apiEndpoint: string;
    enabled: boolean;
  };
}

export const defaultConfig: ScannerConfig = {
  rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  rpcWsEndpoint: process.env.SOLANA_WS_URL || 'wss://api.mainnet-beta.solana.com',
  
  priceUpdateInterval: 1000, // 1 second
  poolStateUpdateInterval: 5000, // 5 seconds
  
  minProfitThreshold: 0.5, // 0.5%
  maxSlippage: 1.0, // 1%
  
  dexes: {
    raydium: {
      name: 'Raydium',
      enabled: true,
      programId: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
    },
    orca: {
      name: 'Orca',
      enabled: true,
      programId: new PublicKey('9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP'),
    },
    meteora: {
      name: 'Meteora',
      enabled: true,
      programId: new PublicKey('Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB'),
    },
    phoenix: {
      name: 'Phoenix',
      enabled: true,
      programId: new PublicKey('PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY'),
    },
  },
  
  monitoredPairs: [
    'SOL/USDC',
    'SOL/USDT',
    'RAY/SOL',
    'ORCA/SOL',
    'JUP/SOL',
  ],
  
  jupiter: {
    apiEndpoint: 'https://quote-api.jup.ag/v6',
    enabled: true,
  },
}; 