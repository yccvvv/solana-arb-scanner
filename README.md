# 🚀 Solana Arbitrage Scanner

**Real-time cross-DEX arbitrage detection system for Solana ecosystem**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)

## 📊 Overview

The Solana Arbitrage Scanner is a sophisticated TypeScript-based system that continuously monitors price differences across multiple Solana DEXes to identify profitable arbitrage opportunities. The system leverages Jupiter's aggregation API to access real-time pricing data from 15+ major Solana protocols.

### 🎯 Key Features

- **Multi-DEX Coverage**: Monitors Raydium, Orca, Meteora, Phoenix AMM/CLMM, OpenBook, Lifinity, and 10+ other protocols
- **Real-time Scanning**: Continuous price monitoring with configurable scan intervals
- **CSV Data Export**: Comprehensive data logging with timestamps, profit calculations, and arbitrage opportunities
- **Rate Limit Compliance**: Respects Jupiter API limits (60 requests/minute) with intelligent backoff
- **Phoenix Protocol Support**: Enhanced detection for Phoenix AMM and Phoenix CLMM variants
- **Multiple Scanner Modes**: From quick tests to comprehensive market analysis

## 🔥 Supported DEX Protocols

| Protocol | Type | Status |
|----------|------|--------|
| **Raydium** | AMM/CLMM | ✅ Active |
| **Orca Whirlpool** | CLMM | ✅ Active |
| **Meteora DLMM** | Dynamic AMM | ✅ Active |
| **Phoenix AMM** | Order Book | ✅ Active |
| **Phoenix CLMM** | Concentrated Liquidity | ✅ Active |
| **OpenBook V2** | Order Book | ✅ Active |
| **Lifinity** | Proactive Market Maker | ✅ Active |
| **SolFi** | AMM | ✅ Active |
| **ZeroFi** | AMM | ✅ Active |
| **Bonkswap** | Meme Token AMM | ✅ Active |
| **Obric V2** | AMM | ✅ Active |
| **Stabble** | Stablecoin AMM | ✅ Active |
| **Saros** | AMM | ✅ Active |

## ⚡ Quick Start

### Prerequisites

- Node.js 18+ 
- NPM or Yarn
- Solana RPC endpoint (Helius, QuickNode, or public)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/solana-arb-scanner.git
cd solana-arb-scanner

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Solana RPC endpoint
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Minimum profit threshold (percentage)
MIN_PROFIT_THRESHOLD=0.05

# Price update interval (milliseconds)
PRICE_UPDATE_INTERVAL=8000
```

## 🎮 Scanner Modes

The system includes multiple scanner modes optimized for different use cases:

### 1. Real DEX Scanner (Recommended)
```bash
npm run real-dex-scan
```
- **Use Case**: Production arbitrage detection
- **Features**: 100% real DEX data, no synthetic prices
- **Output**: Comprehensive CSV with 16 columns
- **Rate Limit**: Fully compliant (2-second delays)

### 2. Phoenix-Focused Scanner
```bash
npm run phoenix-scan
```
- **Use Case**: Phoenix AMM/CLMM specific arbitrage
- **Features**: Enhanced Phoenix protocol detection
- **Output**: CSV with Phoenix protocol tracking
- **Special**: Prioritizes Phoenix-based opportunities

### 3. Conservative Scanner
```bash
npm run conservative-scan
```
- **Use Case**: Long-running data collection
- **Features**: 500+ record generation, minimal API usage
- **Output**: Large dataset for analysis
- **Duration**: Continuous until target reached

### 4. Quick Test Scanner
```bash
npm run quick-csv
```
- **Use Case**: System validation and testing
- **Features**: 5 verified trading pairs
- **Output**: Small CSV for verification
- **Duration**: ~2 minutes

### 5. Price Display
```bash
npm run price-test
```
- **Use Case**: Real-time price monitoring
- **Features**: Live price feeds with DEX comparison
- **Output**: Console display only

## 📈 Sample Results

### Real Arbitrage Opportunities Found

| Pair | Buy DEX | Sell DEX | Profit % | Profit Amount |
|------|---------|----------|----------|---------------|
| **WIF/SAMO** | SolFi | Orca-Whirlpool | **0.2749%** | $1.023 per $100 |
| **BONK/SOL** | Bonkswap | Meteora | **0.0855%** | $0.086 per $100 |
| **WIF/USDC** | Raydium | Orca-Whirlpool | **0.0773%** | $0.077 per $100 |
| **RAY/JUP** | Raydium | Obric V2 | **0.0734%** | $0.073 per $100 |

### CSV Data Structure

Each scanner generates detailed CSV files with the following columns:

- **Timestamp**: ISO 8601 formatted scan time
- **Scan Number**: Sequential scan identifier
- **Trading Pair**: Token pair (e.g., SOL/USDC)
- **DEX**: Protocol name (e.g., Raydium, Orca-Whirlpool)
- **Price**: Token exchange rate
- **Input/Output Amounts**: Trade size and expected output
- **Price Impact**: Slippage percentage
- **Arbitrage Data**: Buy/sell DEX, profit percentage, profit amount
- **Best Opportunity Flag**: Marks highest profit per scan
- **Request Metadata**: Scan duration, request ID

## 🏗️ Architecture

```
solana-arb-scanner/
├── src/
│   ├── config/           # Configuration management
│   ├── types/            # TypeScript interfaces
│   ├── utils/            # Utility functions
│   │   ├── jupiterClient.ts    # Jupiter API integration
│   │   └── tokenUtils.ts       # Token definitions (40+ tokens)
│   ├── scanner/          # Core scanner logic
│   ├── realDexArbitrageScanner.ts    # Main production scanner
│   ├── phoenixFocusedScanner.ts      # Phoenix-specific scanner
│   ├── conservativeArbitrageScanner.ts # Long-running scanner
│   └── quickCsvTest.ts               # Quick validation scanner
├── data/                 # Generated CSV files
├── docs/                 # GitBook documentation
└── README.md
```

## 📊 Data Analysis

The system generates CSV files perfect for:

- **Trading Strategy Development**: Historical arbitrage data
- **Market Analysis**: Cross-DEX price comparison
- **Performance Monitoring**: Scanner efficiency metrics
- **Research**: Solana DEX ecosystem insights

### Sample Data Points

- **200+ Records**: Typical single scan cycle
- **15+ DEX Protocols**: Comprehensive market coverage
- **Sub-second Precision**: Millisecond timestamps
- **Profit Calculations**: Ready-to-use arbitrage metrics

## 🔧 Advanced Configuration

### Token Selection

The scanner monitors 40+ high-liquidity tokens:

**Major Tokens**: SOL, USDC, USDT, RAY, ORCA, JUP
**Meme Tokens**: BONK, WIF, SAMO, MYRO, POPCAT
**DeFi Tokens**: STEP, FIDA, SRM, MER, PORT
**Gaming Tokens**: ATLAS, POLIS, GMT, GST

### Rate Limiting

- **Jupiter API**: 60 requests/minute respected
- **Backoff Strategy**: 2-minute waits on 429 errors
- **Request Spacing**: 2-second minimum delays
- **Monitoring**: Real-time rate tracking

## 📚 Documentation

For detailed documentation, examples, and API references, visit our **GitBook**:

**📖 [Complete Documentation](https://your-gitbook-url.com)**

### Documentation Sections

1. **Getting Started**: Installation and setup
2. **Scanner Modes**: Detailed mode explanations
3. **API Reference**: Jupiter integration details
4. **Data Analysis**: CSV structure and analysis
5. **Examples**: Real arbitrage opportunities
6. **Troubleshooting**: Common issues and solutions

## 🚀 Performance Metrics

- **Scan Speed**: 18 trading pairs in ~2.5 minutes
- **DEX Coverage**: 15+ protocols per scan
- **Accuracy**: 100% real market data
- **Uptime**: Designed for 24/7 operation
- **Data Export**: Real-time CSV generation

## 🛠️ Development

### Building the Project

```bash
# Compile TypeScript
npm run build

# Run compiled version
npm start

# Development mode with hot reload
npm run dev
```

### Testing

```bash
# Quick system test
npm run quick-csv

# Price feed validation
npm run price-test

# Full arbitrage scan
npm run real-dex-scan
```

**⚡ Built for the Solana ecosystem | 🚀 Optimized for professional trading** 
