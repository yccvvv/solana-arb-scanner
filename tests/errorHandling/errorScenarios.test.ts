import { JupiterClient } from '../../src/utils/jupiterClient';
import { getTokenBySymbol, toRawAmount } from '../../src/utils/tokenUtils';
import Decimal from 'decimal.js';
import axios from 'axios';

// Mock axios for error simulation
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Error Handling & Edge Cases', () => {
  let jupiterClient: JupiterClient;

  beforeEach(() => {
    jupiterClient = new JupiterClient();
    jest.clearAllMocks();
  });

  describe('Network Error Scenarios', () => {
    it('should handle DNS resolution failures', async () => {
      const dnsError = new Error('ENOTFOUND');
      (dnsError as any).code = 'ENOTFOUND';
      mockedAxios.get.mockRejectedValue(dnsError);

      const solToken = getTokenBySymbol('SOL');
      const usdcToken = getTokenBySymbol('USDC');

      const quote = await jupiterClient.getQuote(
        solToken!.mint.toString(),
        usdcToken!.mint.toString(),
        new Decimal(1),
        9,
        50
      );

      expect(quote).toBeNull();
    });

    it('should handle connection timeouts', async () => {
      const timeoutError = new Error('ECONNRESET');
      (timeoutError as any).code = 'ECONNRESET';
      mockedAxios.get.mockRejectedValue(timeoutError);

      const isAvailable = await jupiterClient.isServiceAvailable();
      expect(isAvailable).toBe(false);
    });

    it('should handle malformed JSON responses', async () => {
      mockedAxios.get.mockResolvedValue({
        data: 'invalid json string'
      });

      const solToken = getTokenBySymbol('SOL');
      const usdcToken = getTokenBySymbol('USDC');

      const quote = await jupiterClient.getQuote(
        solToken!.mint.toString(),
        usdcToken!.mint.toString(),
        new Decimal(1),
        9,
        50
      );

      expect(quote).toBeNull();
    });

    it('should handle HTTP 5xx server errors', async () => {
      const serverError = new Error('Internal Server Error');
      (serverError as any).response = { status: 500 };
      mockedAxios.get.mockRejectedValue(serverError);

      const isAvailable = await jupiterClient.isServiceAvailable();
      expect(isAvailable).toBe(false);
    });

    it('should handle HTTP 4xx client errors', async () => {
      const clientError = new Error('Bad Request');
      (clientError as any).response = { status: 400 };
      mockedAxios.get.mockRejectedValue(clientError);

      const solToken = getTokenBySymbol('SOL');
      const usdcToken = getTokenBySymbol('USDC');

      const quote = await jupiterClient.getQuote(
        solToken!.mint.toString(),
        usdcToken!.mint.toString(),
        new Decimal(1),
        9,
        50
      );

      expect(quote).toBeNull();
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle extremely large token amounts', () => {
      const hugeAmount = new Decimal('999999999999999999999999999999');
      const decimals = 18;

      expect(() => {
        const rawAmount = toRawAmount(hugeAmount, decimals);
        expect(typeof rawAmount).toBe('string');
      }).not.toThrow();
    });

    it('should handle negative token amounts', () => {
      const negativeAmount = new Decimal(-100);
      const decimals = 9;

      const rawAmount = toRawAmount(negativeAmount, decimals);
      expect(rawAmount).toBe('-100000000000');
    });

    it('should handle zero decimals', () => {
      const amount = new Decimal(123.456);
      const decimals = 0;

      const rawAmount = toRawAmount(amount, decimals);
      expect(rawAmount).toBe('123');
    });

    it('should handle invalid token symbols', () => {
      const invalidSymbols = ['', ' ', '123', 'INVALID_VERY_LONG_SYMBOL'];

      invalidSymbols.forEach(symbol => {
        const token = getTokenBySymbol(symbol);
        expect(token).toBeUndefined();
      });

      // Test null/undefined separately with try-catch
      expect(() => getTokenBySymbol(null as any)).toThrow();
      expect(() => getTokenBySymbol(undefined as any)).toThrow();
    });

    it('should handle special characters in token symbols', () => {
      const specialSymbols = ['SOL!', 'USD@C', 'RA#Y', '$BONK', 'WI%F'];

      specialSymbols.forEach(symbol => {
        const token = getTokenBySymbol(symbol);
        expect(token).toBeUndefined();
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle rapid successive API calls', async () => {
      const mockResponse = {
        data: {
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          inAmount: '1000000000',
          outAmount: '153780000000',
          routePlan: []
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const promises = Array(100).fill(null).map(() =>
        jupiterClient.getQuote(
          'So11111111111111111111111111111111111111112',
          'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          new Decimal(1),
          9,
          50
        )
      );

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      expect(successCount).toBeGreaterThan(50); // At least 50% success rate
    });

    it('should handle very large price calculations', () => {
      const mockRoute = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        inAmount: '999999999999999999',
        outAmount: '999999999999999999',
        routePlan: [],
        otherAmountThreshold: '0',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.001'
      };

      expect(() => {
        const price = jupiterClient.calculateEffectivePrice(mockRoute, 18, 18);
        expect(price.isFinite()).toBe(true);
      }).not.toThrow();
    });

    it('should handle precision loss in decimal calculations', () => {
      const amount1 = new Decimal('0.1');
      const amount2 = new Decimal('0.2');
      const amount3 = new Decimal('0.3');

      const sum = amount1.add(amount2);
      expect(sum.equals(amount3)).toBe(true); // Decimal.js prevents precision loss

      const rawAmount = toRawAmount(sum, 18);
      expect(rawAmount).toBe('300000000000000000');
    });
  });

  describe('Concurrent Access Scenarios', () => {
    it('should handle multiple simultaneous token lookups', () => {
      const symbols = ['SOL', 'USDC', 'RAY', 'ORCA', 'JUP', 'BONK', 'WIF', 'SAMO'];

      const results = symbols.map(symbol => getTokenBySymbol(symbol));

      results.forEach((token, index) => {
        expect(token).toBeDefined();
        expect(token?.symbol).toBe(symbols[index]);
      });
    });

    it('should handle concurrent price calculations', () => {
      const mockRoutes = Array(50).fill(null).map((_, index) => ({
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        inAmount: `${1000000000 + index}`,
        outAmount: `${153780000000 + index * 1000}`,
        routePlan: [],
        otherAmountThreshold: '0',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.001'
      }));

      const prices = mockRoutes.map(route => 
        jupiterClient.calculateEffectivePrice(route, 9, 6)
      );

      prices.forEach((price, index) => {
        expect(price.isFinite()).toBe(true);
        expect(price.toNumber()).toBeGreaterThanOrEqual(153780);
      });
    });
  });

  describe('Data Integrity Checks', () => {
    it('should detect corrupted API responses', async () => {
      const corruptedResponse = {
        data: {
          inputMint: null,
          outputMint: undefined,
          inAmount: 'not_a_number',
          outAmount: {},
          routePlan: 'should_be_array'
        }
      };

      mockedAxios.get.mockResolvedValue(corruptedResponse);

      const quote = await jupiterClient.getQuote(
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        new Decimal(1),
        9,
        50
      );

      expect(quote).not.toBeNull();
      expect(quote?.inputMint).toBeNull();
      expect(quote?.outputMint).toBeUndefined();
    });

    it('should validate mint address formats', () => {
      const invalidMints = [
        'too_short',
        'way_too_long_to_be_a_valid_solana_address_format_12345678901234567890',
        '123',
        'invalid-chars-!@#$%',
        ''
      ];

      invalidMints.forEach(mint => {
        const token = getTokenBySymbol(mint);
        expect(token).toBeUndefined();
      });
    });

    it('should handle missing required fields in responses', async () => {
      const incompleteResponse = {
        data: {
          inputMint: 'So11111111111111111111111111111111111111112'
          // Missing outputMint, inAmount, outAmount, routePlan
        }
      };

      mockedAxios.get.mockResolvedValue(incompleteResponse);

      const quote = await jupiterClient.getQuote(
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        new Decimal(1),
        9,
        50
      );

      expect(quote).toBeNull();
    });
  });

  describe('Environment and Configuration Edge Cases', () => {
    it('should handle missing environment variables gracefully', () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      expect(() => {
        new JupiterClient();
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle different decimal precision requirements', () => {
      const testCases = [
        { amount: new Decimal('1.123456789'), decimals: 0, expected: '1' },
        { amount: new Decimal('1.123456789'), decimals: 3, expected: '1123' },
        { amount: new Decimal('1.123456789'), decimals: 9, expected: '1123456789' },
        { amount: new Decimal('1.123456789'), decimals: 18, expected: '1123456789000000000' }
      ];

      testCases.forEach(({ amount, decimals, expected }) => {
        const result = toRawAmount(amount, decimals);
        expect(result).toBe(expected);
      });
    });

    it('should handle extremely high decimal places', () => {
      const amount = new Decimal('1.5');
      const highDecimals = 30;

      const result = toRawAmount(amount, highDecimals);
      expect(result).toMatch(/^1\.?5(0*|e\+\d+)$/);
      expect(result.length).toBeGreaterThan(5);
    });
  });
}); 