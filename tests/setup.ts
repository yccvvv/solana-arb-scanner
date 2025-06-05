// Test setup configuration
import 'dotenv/config';

// Mock environment variables
process.env.SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
process.env.NODE_ENV = 'test';
process.env.MIN_PROFIT_THRESHOLD = '0.001'; 