# ⚡ Quick Start

Get your first arbitrage scan running in under 5 minutes with this streamlined guide.

## 🎯 Prerequisites Check

Before starting, ensure you have:
- ✅ **Node.js 18+** installed
- ✅ **Git** available
- ✅ **Terminal/Command Line** access

## 🚀 5-Minute Setup

### **1. Clone & Install**
```bash
# Clone the repository
git clone https://github.com/yccvvv/solana-arb-scanner.git
cd solana-arb-scanner

# Install dependencies (2-3 minutes)
npm install
```

### **2. Basic Configuration**
```bash
# Copy environment template
cp env.example .env

# Edit with nano (or your preferred editor)
nano .env
```

**Minimal .env configuration:**
```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
MIN_PROFIT_THRESHOLD=0.05
PRICE_UPDATE_INTERVAL=8000
```

### **3. First Scan**
```bash
# Run quick test (takes ~2 minutes)
npm run quick-csv
```

## 🎉 Expected Output

You should see output like this:

```
🚀 QUICK CSV ARBITRAGE TEST
════════════════════════════════════════════════════════════════════════════════
⚡ Quick test of 5 verified trading pairs
📊 Generating small CSV for verification

🔄 QUICK SCAN #1
════════════════════════════════════════════════════════════════════════════════
🔍 [1/5] SOL/USDC
   💰 Best: 0.0234% (Raydium → Orca-Whirlpool)
🔍 [2/5] RAY/SOL  
   💰 Best: 0.0180% (SolFi → Meteora)
...

✅ Quick test completed successfully!
📁 Data saved to: data/quick_arbitrage_test_[timestamp].csv
📊 Generated 12 arbitrage records
```

## 📊 Verify Results

Check your results:

```bash
# List generated files
ls data/

# View CSV content (first 10 lines)
head -10 data/quick_arbitrage_test_*.csv
```

## 🎮 Try Different Modes

Now that it's working, explore other scanner modes:

### **Real DEX Scanner (Recommended)**
```bash
npm run real-dex-scan
```
- **Purpose**: Production arbitrage detection
- **Duration**: Continuous (stop with Ctrl+C)
- **Output**: 200+ records with real opportunities

### **Price Display Mode**
```bash
npm run price-test
```
- **Purpose**: Live price monitoring
- **Duration**: Continuous display
- **Output**: Console only (no CSV)

### **Phoenix-Focused Scanner**
```bash
npm run phoenix-scan
```
- **Purpose**: Phoenix AMM/CLMM specific opportunities
- **Duration**: Targeted scanning
- **Output**: Phoenix protocol tracking

## 🔧 Next Steps

### **Immediate Actions**
1. **📊 Analyze Data**: Open CSV files in Excel/Google Sheets
2. **🔍 Explore Results**: Look for arbitrage opportunities
3. **⚙️ Customize**: Edit trading pairs in scanner files
4. **📚 Read Docs**: Explore detailed documentation sections

### **Production Setup**
1. **🌐 Premium RPC**: Sign up for Helius/QuickNode for better performance
2. **📈 Monitor**: Set up continuous scanning
3. **🎯 Optimize**: Adjust profit thresholds and trading pairs
4. **📊 Analyze**: Use data for trading strategy development

## 🐛 Quick Troubleshooting

### **Common Issues**

| **Problem** | **Solution** |
|-------------|--------------|
| `Command not found: npm` | Install Node.js from [nodejs.org](https://nodejs.org) |
| `Permission denied` | Run `sudo chown -R $(whoami) ~/.npm` |
| `RPC connection failed` | Check internet connection, try premium RPC |
| `No arbitrage found` | Normal - opportunities are rare and brief |

### **Get Help**
- **📚 Full Documentation**: [Installation Guide](installation.md)
- **💰 Real Examples**: [Arbitrage Examples](../data-analysis/real-examples.md)
- **🔧 Configuration**: [Advanced Setup](../configuration/environment.md)

## 🎯 Success Indicators

You've successfully set up the scanner when you see:

✅ **Installation**: No errors during `npm install`  
✅ **Configuration**: `.env` file created and edited  
✅ **First Scan**: CSV file generated in `data/` directory  
✅ **Data Output**: Arbitrage records with timestamps and DEX info  

## 📈 What You've Achieved

In just 5 minutes, you now have:

- 🔄 **Working scanner** monitoring 5+ trading pairs
- 📊 **Real data** with actual arbitrage opportunities  
- 💾 **CSV export** ready for analysis
- 🎯 **Foundation** for advanced trading strategies

**🚀 Ready to find real arbitrage opportunities in the Solana ecosystem!** 