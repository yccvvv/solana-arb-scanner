import { JupiterClient } from '../../src/utils/jupiterClient';
import { getTokenBySymbol } from '../../src/utils/tokenUtils';
import Decimal from 'decimal.js';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('JupiterClient', () => {
  let jupiterClient: JupiterClient;

  beforeEach(() => {
    jupiterClient = new JupiterClient();
    jest.clearAllMocks();
  });

  describe('getQuote', () => {
    it('should return a valid quote for SOL/USDC', async () => {
      const mockResponse = {
        data: {
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          inAmount: '1000000000',
          outAmount: '153780000000',
          priceImpactPct: 0.001,
          routePlan: [
            {
              swapInfo: {
                label: 'Raydium',
                inputMint: 'So11111111111111111111111111111111111111112',
                outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                inAmount: '1000000000',
                outAmount: '153780000000'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const solToken = getTokenBySymbol('SOL');
      const usdcToken = getTokenBySymbol('USDC');
      
      expect(solToken).toBeDefined();
      expect(usdcToken).toBeDefined();

      const quote = await jupiterClient.getQuote(
        solToken!.mint.toString(),
        usdcToken!.mint.toString(),
        new Decimal(1),
        solToken!.decimals,
        50
      );

      expect(quote).toBeDefined();
      expect(quote?.routePlan).toBeDefined();
      expect(quote?.outAmount).toBe('153780000000');
      expect(quote?.priceImpactPct).toBe(0.001);
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const solToken = getTokenBySymbol('SOL');
      const usdcToken = getTokenBySymbol('USDC');

      const quote = await jupiterClient.getQuote(
        solToken!.mint.toString(),
        usdcToken!.mint.toString(),
        new Decimal(1),
        solToken!.decimals,
        50
      );

      expect(quote).toBeNull();
    });

    it('should handle rate limiting (429 errors)', async () => {
      const error = new Error('Rate limited');
      (error as any).response = { status: 429 };
      mockedAxios.get.mockRejectedValue(error);

      const solToken = getTokenBySymbol('SOL');
      const usdcToken = getTokenBySymbol('USDC');

      const quote = await jupiterClient.getQuote(
        solToken!.mint.toString(),
        usdcToken!.mint.toString(),
        new Decimal(1),
        solToken!.decimals,
        50
      );

      expect(quote).toBeNull();
    });

    it('should handle invalid token pairs', async () => {
      const invalidMint = 'InvalidMintAddress';
      const usdcToken = getTokenBySymbol('USDC');

      mockedAxios.get.mockResolvedValue({ data: null });

      const quote = await jupiterClient.getQuote(
        invalidMint,
        usdcToken!.mint.toString(),
        new Decimal(1),
        9,
        50
      );

      expect(quote).toBeNull();
    });
  });

  describe('calculateEffectivePrice', () => {
    it('should calculate correct effective price', () => {
      const mockRoute = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        inAmount: '1000000000',  // 1 SOL (9 decimals)
        outAmount: '153780000000', // 153.78 USDC (6 decimals)
        routePlan: [],
        otherAmountThreshold: '0',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.001'
      };

      const price = jupiterClient.calculateEffectivePrice(mockRoute, 9, 6);
      
      // The calculation returns raw value, not decimal-adjusted
      expect(price.toNumber()).toBeCloseTo(153780, 2);
    });

    it('should handle zero amounts', () => {
      const mockRoute = {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        inAmount: '0',
        outAmount: '0',
        routePlan: [],
        otherAmountThreshold: '0',
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0'
      };

      const price = jupiterClient.calculateEffectivePrice(mockRoute, 9, 6);
      
      expect(price.isNaN()).toBe(true);
    });
  });

  describe('isServiceAvailable', () => {
    it('should return true when service is available', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200 });

      const isAvailable = await jupiterClient.isServiceAvailable();
      
      expect(isAvailable).toBe(true);
    });

    it('should return false when service is unavailable', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Service unavailable'));

      const isAvailable = await jupiterClient.isServiceAvailable();
      
      expect(isAvailable).toBe(false);
    });
  });
}); 