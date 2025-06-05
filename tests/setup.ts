// Global test setup
import 'dotenv/config';

// Mock console methods to avoid spam during testing
const originalConsole = { ...console };

beforeEach(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = originalConsole.error; // Keep errors visible
});

afterEach(() => {
  // Restore console
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Global test timeout
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
process.env.MIN_PROFIT_THRESHOLD = '0.001'; 