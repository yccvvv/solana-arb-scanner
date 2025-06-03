# 🔧 Installation Guide

**Complete setup instructions for the Solana Arbitrage Scanner**

## 📋 System Requirements

### **Minimum Requirements**
- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **Node.js**: Version 18.0 or higher
- **RAM**: 2GB available memory
- **Storage**: 1GB free disk space
- **Internet**: Stable broadband connection

### **Recommended Setup**
- **Operating System**: Linux Ubuntu 20.04+ or macOS 12+
- **Node.js**: Version 20.0 (LTS)
- **RAM**: 4GB+ available memory
- **Storage**: 5GB+ free disk space (for data storage)
- **Internet**: Premium RPC endpoint (Helius, QuickNode, or Alchemy)

## 🚀 Installation Steps

### **Step 1: Install Node.js**

**Windows:**
```bash
# Download from https://nodejs.org
# Choose "LTS" version
# Run installer with default settings
```

**macOS:**
```bash
# Using Homebrew (recommended)
brew install node

# Or download from https://nodejs.org
```

**Linux (Ubuntu/Debian):**
```bash
# Update package manager
sudo apt update

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### **Step 2: Clone Repository**

```bash
# Clone from GitHub
git clone https://github.com/yccvvv/solana-arb-scanner.git

# Navigate to project directory
cd solana-arb-scanner

# Verify contents
ls -la
```

### **Step 3: Install Dependencies**

```bash
# Install all required packages (2-3 minutes)
npm install

# Verify installation
npm list --depth=0
```

### **Step 4: Environment Configuration**

```bash
# Copy environment template
cp env.example .env

# Open for editing
nano .env
```

**Basic Configuration:**
```env
# Solana RPC endpoint (start with free public endpoint)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Minimum profit threshold (0.05 = 0.05%)
MIN_PROFIT_THRESHOLD=0.05

# Update interval in milliseconds (8000 = 8 seconds)
PRICE_UPDATE_INTERVAL=8000

# Optional: Premium RPC for better performance
# SOLANA_RPC_URL=https://YOUR_PREMIUM_RPC_URL
```

### **Step 5: Verify Installation**

```bash
# Run quick test (should complete in ~2 minutes)
npm run quick-csv

# Check for success message
# Look for CSV file in data/ directory
ls data/
```

## 🔧 Advanced Configuration

### **Premium RPC Setup (Recommended)**

For production use, consider premium RPC providers:

#### **Helius (Recommended)**
```env
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```
- **Benefits**: Faster response, higher rate limits
- **Cost**: Free tier available, paid plans from $20/month
- **Setup**: [Sign up at helius.xyz](https://helius.xyz)

#### **QuickNode**
```env
SOLANA_RPC_URL=https://solana-mainnet.quiknode.pro/YOUR_ENDPOINT_ID/
```
- **Benefits**: Enterprise-grade reliability
- **Cost**: Free tier available, paid plans from $20/month
- **Setup**: [Sign up at quicknode.com](https://quicknode.com)

#### **Alchemy**
```env
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```
- **Benefits**: Good free tier, detailed analytics
- **Cost**: Free tier available, paid plans from $199/month
- **Setup**: [Sign up at alchemy.com](https://alchemy.com)

### **Performance Tuning**

#### **For High-Frequency Scanning**
```env
MIN_PROFIT_THRESHOLD=0.01
PRICE_UPDATE_INTERVAL=5000
MAX_PARALLEL_REQUESTS=5
REQUEST_TIMEOUT=10000
```

#### **For Conservative Scanning**
```env
MIN_PROFIT_THRESHOLD=0.10
PRICE_UPDATE_INTERVAL=15000
MAX_PARALLEL_REQUESTS=2
REQUEST_TIMEOUT=30000
```

## 🛠️ Additional Tools

### **CSV Analysis Tools**

**Excel/Google Sheets:**
- Open CSV files directly
- Use pivot tables for analysis
- Create charts and graphs

**Python Analysis (Optional):**
```bash
# Install pandas for advanced analysis
pip install pandas matplotlib

# Example analysis script available in docs/examples/
```

### **Monitoring Setup**

**Process Manager (Optional):**
```bash
# Install PM2 for production deployment
npm install -g pm2

# Start scanner with PM2
pm2 start "npm run real-dex-scan" --name "solana-arbitrage"

# Monitor status
pm2 status
pm2 logs solana-arbitrage
```

## 🐛 Troubleshooting

### **Common Installation Issues**

| **Issue** | **Cause** | **Solution** |
|-----------|-----------|--------------|
| `npm install` fails | Node.js version too old | Update to Node.js 18+ |
| Permission denied | User permissions | Run `sudo chown -R $(whoami) ~/.npm` |
| Module not found | Dependencies missing | Delete `node_modules`, run `npm install` again |
| RPC connection fails | Invalid endpoint | Check `.env` file, verify RPC URL |

### **Performance Issues**

| **Issue** | **Cause** | **Solution** |
|-----------|-----------|--------------|
| Slow scanning | Public RPC limits | Upgrade to premium RPC endpoint |
| Memory usage high | Large datasets | Reduce scan interval, limit trading pairs |
| 429 errors | Rate limiting | Increase `PRICE_UPDATE_INTERVAL` |
| Network timeouts | Connection issues | Check internet connection, try different RPC |

### **Data Issues**

| **Issue** | **Cause** | **Solution** |
|-----------|-----------|--------------|
| No CSV files generated | Scanner crashed | Check console for errors |
| Empty arbitrage opportunities | Market efficiency | Normal - opportunities are rare |
| Duplicate data | Multiple instances | Ensure only one scanner running |
| Invalid prices | Stale data | Restart scanner, check RPC health |

## 📞 Support

### **Self-Help Resources**
- **📚 Documentation**: [Complete Guide](../README.md)
- **💰 Examples**: [Real Arbitrage Data](../data-analysis/real-examples.md)
- **🎮 Usage**: [Scanner Modes](../core-features/scanner-modes.md)

### **Direct Support**
- **🐛 Issues**: [GitHub Issues](https://github.com/yccvvv/solana-arb-scanner/issues)
- **📧 Email**: Available for implementation assistance
- **💬 Community**: Developer support available

## ✅ Installation Checklist

- [ ] **Node.js 18+** installed and verified
- [ ] **Repository cloned** successfully
- [ ] **Dependencies installed** without errors
- [ ] **Environment configured** with valid RPC endpoint
- [ ] **Quick test passed** - CSV file generated
- [ ] **Premium RPC setup** (recommended for production)
- [ ] **Monitoring tools** installed (optional)

---

**🎯 Once installation is complete, you're ready to start finding arbitrage opportunities in the Solana ecosystem!** 

**Next Steps**: [Run your first scan](quick-start.md) or explore [scanner modes](../core-features/scanner-modes.md). 