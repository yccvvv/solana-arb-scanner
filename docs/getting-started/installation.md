# 🔧 Installation Guide

Get the Solana Arbitrage Scanner up and running in just a few minutes with this comprehensive installation guide.

## 📋 Prerequisites

Before installing the scanner, ensure you have the following requirements:

### **System Requirements**
- **Node.js**: Version 18.0.0 or higher
- **NPM**: Version 8.0.0 or higher (or Yarn)
- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: 1GB free space for installation and data

### **Network Requirements**
- **Internet Connection**: Stable broadband connection
- **RPC Access**: Solana RPC endpoint (public or premium)
- **Firewall**: Allow outbound HTTPS connections

### **Optional (Recommended)**
- **Premium RPC**: Helius, QuickNode, or Alchemy for better performance
- **Git**: For cloning the repository
- **TypeScript Knowledge**: For customization

---

## 🚀 Step 1: Clone the Repository

### **Option A: Using Git (Recommended)**
```bash
# Clone the repository
git clone https://github.com/your-username/solana-arb-scanner.git

# Navigate to the project directory
cd solana-arb-scanner
```

### **Option B: Download ZIP**
1. Visit the [GitHub repository](https://github.com/your-username/solana-arb-scanner)
2. Click the green "Code" button
3. Select "Download ZIP"
4. Extract the ZIP file to your desired location
5. Open a terminal in the extracted folder

---

## 📦 Step 2: Install Dependencies

Install all required Node.js packages:

```bash
# Install dependencies using npm
npm install

# OR using yarn (if you prefer)
yarn install
```

### **What Gets Installed**

| Package | Purpose | Version |
|---------|---------|---------|
| `@solana/web3.js` | Solana blockchain interaction | ^1.98.2 |
| `@jup-ag/api` | Jupiter aggregator API | ^6.0.42 |
| `typescript` | TypeScript language support | ^5.8.3 |
| `decimal.js` | Precise decimal calculations | ^10.5.0 |
| `csv-writer` | CSV data export | ^1.6.0 |
| `dotenv` | Environment variable management | ^16.5.0 |
| `axios` | HTTP client for API calls | ^1.9.0 |

### **Verify Installation**
```bash
# Check Node.js version
node --version
# Should output: v18.0.0 or higher

# Check npm version
npm --version
# Should output: 8.0.0 or higher

# Verify TypeScript compilation
npm run build
# Should complete without errors
```

---

## ⚙️ Step 3: Environment Configuration

### **Create Environment File**
```bash
# Copy the example environment file
cp env.example .env

# Edit the environment file
nano .env
# OR use your preferred text editor
```

### **Basic Configuration**
Add the following to your `.env` file:

```env
# Solana RPC endpoint
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Minimum profit threshold (0.05 = 0.05%)
MIN_PROFIT_THRESHOLD=0.05

# Update interval (8000ms = 8 seconds)
PRICE_UPDATE_INTERVAL=8000
```

### **Premium RPC Setup (Recommended)**

For better performance and reliability, use a premium RPC provider:

#### **Helius**
```env
SOLANA_RPC_URL=https://rpc.helius.xyz/?api-key=YOUR_API_KEY
```

#### **QuickNode**
```env
SOLANA_RPC_URL=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_API_KEY/
```

#### **Alchemy**
```env
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

---

## ✅ Step 4: Verify Installation

### **Quick Test**
Run a quick test to verify everything is working:

```bash
# Run the quick test scanner
npm run quick-csv
```

**Expected Output:**
```
🚀 QUICK CSV ARBITRAGE TEST
════════════════════════════════════════════════════════════════════════════════
⚡ Quick test of 5 verified trading pairs
📊 Generating small CSV for verification

🔄 QUICK SCAN #1
════════════════════════════════════════════════════════════════════════════════
🔍 [1/5] SOL/USDC
   💰 Best: 0.0234% (Raydium → Orca-Whirlpool)
...
✅ Quick test completed successfully!
📁 Data saved to: data/quick_arbitrage_test_[timestamp].csv
```

### **Build Test**
Verify TypeScript compilation:

```bash
# Compile TypeScript to JavaScript
npm run build

# Check that dist/ directory was created
ls dist/
# Should show compiled JavaScript files
```

### **Scanner Modes Test**
Test different scanner modes:

```bash
# Test price display
npm run price-test

# Test real DEX scanner (interrupt with Ctrl+C after a few minutes)
npm run real-dex-scan
```

---

## 🛠️ Step 5: Optional Configuration

### **Custom Token Configuration**
Edit token lists in `src/utils/tokenUtils.ts`:

```typescript
// Add new tokens to monitor
export const TOKEN_LIST = {
  // Existing tokens...
  'YOUR_TOKEN': {
    mint: new PublicKey('YOUR_TOKEN_MINT_ADDRESS'),
    decimals: 6,
    symbol: 'YOUR_TOKEN'
  }
};
```

### **Scanner Parameters**
Modify scanner settings in each scanner file:

```typescript
// Adjust trading pairs
const tradingPairs = [
  { from: 'SOL', to: 'USDC', amount: new Decimal(1) },
  // Add your preferred pairs
];

// Adjust stopping conditions
if (this.totalRecords >= 500) {  // Change target
  break;
}
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **Node.js Version Error**
```
Error: The engine "node" is incompatible with this module
```
**Solution**: Upgrade to Node.js 18+
```bash
# Using nvm (recommended)
nvm install 18
nvm use 18

# Or download from https://nodejs.org
```

#### **Permission Errors**
```
Error: EACCES: permission denied
```
**Solution**: Fix npm permissions or use yarn
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# OR use yarn instead
npm install -g yarn
yarn install
```

#### **RPC Connection Errors**
```
Error: 429 Too Many Requests
Error: Connection refused
```
**Solution**: 
1. Use a premium RPC endpoint
2. Check your internet connection
3. Verify the RPC URL is correct

#### **CSV Permission Errors**
```
Error: EACCES: permission denied, open 'data/...'
```
**Solution**: Ensure write permissions
```bash
# Create data directory with proper permissions
mkdir -p data
chmod 755 data
```

#### **TypeScript Compilation Errors**
```
Error: Cannot find module '@types/...'
```
**Solution**: Reinstall dependencies
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### **Performance Issues**

#### **Slow Scanning**
- **Use premium RPC**: Public RPCs are often rate-limited
- **Reduce pairs**: Monitor fewer trading pairs initially
- **Increase intervals**: Set longer delays between requests

#### **High Memory Usage**
- **Regular restarts**: Restart scanner periodically
- **Reduce batch size**: Process fewer pairs per scan
- **Monitor CSV size**: Large CSV files can consume memory

---

## 📊 Verify Data Output

After successful installation, you should see:

### **Directory Structure**
```
solana-arb-scanner/
├── data/                     # Generated CSV files
├── dist/                     # Compiled TypeScript
├── node_modules/             # Dependencies
├── src/                      # Source code
├── docs/                     # Documentation
├── .env                      # Your configuration
└── package.json              # Project metadata
```

### **Sample CSV Output**
Check the `data/` directory for CSV files with names like:
- `quick_arbitrage_test_2025-06-03T02-12-42-689Z.csv`
- `real_dex_arbitrage_2025-06-03T02-49-16-508Z.csv`

### **CSV Content Verification**
Open any generated CSV file and verify it contains:
- Timestamp columns
- Trading pair data
- DEX information
- Price and arbitrage calculations

---

## 🎉 Installation Complete!

You now have a fully functional Solana Arbitrage Scanner. Here's what you can do next:

### **Immediate Next Steps**
1. **Run Quick Test**: `npm run quick-csv` to verify functionality
2. **Try Real Scanner**: `npm run real-dex-scan` for live data
3. **Explore Data**: Open generated CSV files in Excel or Google Sheets
4. **Read Documentation**: Explore other sections of this guide

### **Recommended Next Steps**
1. **Set up Premium RPC**: For better performance and reliability
2. **Customize Pairs**: Add tokens you're interested in monitoring
3. **Schedule Runs**: Set up automated scanning
4. **Analyze Data**: Use the CSV data for your research or trading

---

**🎯 Success!** Your Solana Arbitrage Scanner is ready to detect cross-DEX arbitrage opportunities across the Solana ecosystem. 