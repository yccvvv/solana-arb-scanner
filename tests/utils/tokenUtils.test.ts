import { getTokenBySymbol, toRawAmount } from '../../src/utils/tokenUtils';
import { PublicKey } from '@solana/web3.js';
import Decimal from 'decimal.js';

describe('TokenUtils', () => {
  describe('getTokenBySymbol', () => {
    it('should return SOL token info', () => {
      const solToken = getTokenBySymbol('SOL');
      
      expect(solToken).toBeDefined();
      expect(solToken?.symbol).toBe('SOL');
      expect(solToken?.decimals).toBe(9);
      expect(solToken?.mint).toBeInstanceOf(PublicKey);
    });

    it('should return USDC token info', () => {
      const usdcToken = getTokenBySymbol('USDC');
      
      expect(usdcToken).toBeDefined();
      expect(usdcToken?.symbol).toBe('USDC');
      expect(usdcToken?.decimals).toBe(6);
      expect(usdcToken?.mint).toBeInstanceOf(PublicKey);
    });

    it('should return RAY token info', () => {
      const rayToken = getTokenBySymbol('RAY');
      
      expect(rayToken).toBeDefined();
      expect(rayToken?.symbol).toBe('RAY');
      expect(rayToken?.decimals).toBe(6);
      expect(rayToken?.mint).toBeInstanceOf(PublicKey);
    });

    it('should return ORCA token info', () => {
      const orcaToken = getTokenBySymbol('ORCA');
      
      expect(orcaToken).toBeDefined();
      expect(orcaToken?.symbol).toBe('ORCA');
      expect(orcaToken?.decimals).toBe(6);
      expect(orcaToken?.mint).toBeInstanceOf(PublicKey);
    });

    it('should return JUP token info', () => {
      const jupToken = getTokenBySymbol('JUP');
      
      expect(jupToken).toBeDefined();
      expect(jupToken?.symbol).toBe('JUP');
      expect(jupToken?.decimals).toBe(6);
      expect(jupToken?.mint).toBeInstanceOf(PublicKey);
    });

    it('should return meme tokens (BONK, WIF, SAMO)', () => {
      const bonkToken = getTokenBySymbol('BONK');
      const wifToken = getTokenBySymbol('WIF');
      const samoToken = getTokenBySymbol('SAMO');
      
      expect(bonkToken).toBeDefined();
      expect(bonkToken?.symbol).toBe('BONK');
      expect(bonkToken?.decimals).toBe(5);

      expect(wifToken).toBeDefined();
      expect(wifToken?.symbol).toBe('WIF');
      expect(wifToken?.decimals).toBe(6);

      expect(samoToken).toBeDefined();
      expect(samoToken?.symbol).toBe('SAMO');
      expect(samoToken?.decimals).toBe(9);
    });

    it('should return null for unknown token', () => {
      const unknownToken = getTokenBySymbol('UNKNOWN');
      
      expect(unknownToken).toBeUndefined();
    });

    it('should handle case insensitive lookup', () => {
      const solToken1 = getTokenBySymbol('SOL');
      const solToken2 = getTokenBySymbol('sol');
      const solToken3 = getTokenBySymbol('Sol');
      
      expect(solToken1).toBeDefined();
      expect(solToken2).toBeDefined();
      expect(solToken3).toBeDefined();
      
      expect(solToken1?.symbol).toBe(solToken2?.symbol);
      expect(solToken1?.symbol).toBe(solToken3?.symbol);
    });

    it('should handle empty string', () => {
      const emptyToken = getTokenBySymbol('');
      
      expect(emptyToken).toBeUndefined();
    });
  });

  describe('toRawAmount', () => {
    it('should convert 1 SOL to raw amount (9 decimals)', () => {
      const amount = new Decimal(1);
      const decimals = 9;
      
      const rawAmount = toRawAmount(amount, decimals);
      
      expect(rawAmount).toBe('1000000000');
    });

    it('should convert 1 USDC to raw amount (6 decimals)', () => {
      const amount = new Decimal(1);
      const decimals = 6;
      
      const rawAmount = toRawAmount(amount, decimals);
      
      expect(rawAmount).toBe('1000000');
    });

    it('should handle fractional amounts', () => {
      const amount = new Decimal(0.5);
      const decimals = 6;
      
      const rawAmount = toRawAmount(amount, decimals);
      
      expect(rawAmount).toBe('500000');
    });

    it('should handle very small amounts', () => {
      const amount = new Decimal(0.000001);
      const decimals = 6;
      
      const rawAmount = toRawAmount(amount, decimals);
      
      expect(rawAmount).toBe('1');
    });

    it('should handle large amounts', () => {
      const amount = new Decimal(1000000);
      const decimals = 9;
      
      const rawAmount = toRawAmount(amount, decimals);
      
      expect(rawAmount).toBe('1000000000000000');
    });

    it('should handle zero amount', () => {
      const amount = new Decimal(0);
      const decimals = 9;
      
      const rawAmount = toRawAmount(amount, decimals);
      
      expect(rawAmount).toBe('0');
    });

    it('should floor the result (no fractional raw amounts)', () => {
      const amount = new Decimal(1.9999999);
      const decimals = 0;
      
      const rawAmount = toRawAmount(amount, decimals);
      
      expect(rawAmount).toBe('1');
    });
  });

  describe('Token validity', () => {
    it('should have valid PublicKey addresses for all tokens', () => {
      const tokenSymbols = ['SOL', 'USDC', 'USDT', 'RAY', 'ORCA', 'JUP', 'BONK', 'WIF', 'SAMO'];
      
      tokenSymbols.forEach(symbol => {
        const token = getTokenBySymbol(symbol);
        expect(token).toBeDefined();
        
        // Test that the PublicKey is valid
        expect(() => {
          new PublicKey(token!.mint.toString());
        }).not.toThrow();
      });
    });

    it('should have consistent decimal places for stablecoins', () => {
      const usdc = getTokenBySymbol('USDC');
      const usdt = getTokenBySymbol('USDT');
      
      expect(usdc?.decimals).toBe(6);
      expect(usdt?.decimals).toBe(6);
    });

    it('should have 9 decimals for native SOL', () => {
      const sol = getTokenBySymbol('SOL');
      
      expect(sol?.decimals).toBe(9);
    });
  });
}); 