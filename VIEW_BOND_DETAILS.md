# Quick Guide: Where to See Bond Details on Sonic Testnet Explorer

## 📍 Step 0: Get Your Contract Address

**Where to find the contract address:**

1. **Admin Panel** → **Investment Opportunities** → Find your opportunity → Look for "Contract Address"
2. **Admin Panel** → **Blockchain** tab → Find your investment → "Contract Address" column
3. **API**: `GET /api/blockchain/contract-info/:opportunityId` → Returns `contractAddress`
4. **API**: `GET /api/blockchain/user-holdings/:walletAddress` → Returns holdings with contract addresses
5. **From Transaction**: If you have the mint transaction hash, go to the transaction page and the "To" address is the contract

**Note:** Contract address looks like: `0x1234567890abcdef1234567890abcdef12345678`

## 🎯 Quick Links

After you get the contract address, here's where to find bond details:

### 1. **View Contract Details** (Most Important)
```
https://testnet.sonicscan.org/address/YOUR_CONTRACT_ADDRESS
```

**What to check:**
- ✅ **Events Tab** → Look for `BondsMinted` events
- ✅ **Token Transfers Tab** → See all bond transfers
- ✅ **Read Contract Tab** → Click to see:
  - `totalBondsIssued()` - Total bonds issued
  - `bondPrice()` - Price per bond
  - `maturityDate()` - When bonds mature
  - `couponRate()` - Interest rate
  - `opportunityId()` - Investment opportunity ID

### 2. **View Your Wallet**
```
https://testnet.sonicscan.org/address/YOUR_WALLET_ADDRESS
```

**What to check:**
- ✅ **Token Holdings Tab** → Your bond tokens appear here
- ✅ **Transactions Tab** → See minting transaction
- ✅ **Token Transfers Tab** → See when bonds were received

### 3. **View Mint Transaction**
```
https://testnet.sonicscan.org/tx/YOUR_TRANSACTION_HASH
```

**What to check:**
- ✅ **Events Logs** → `BondsMinted` event with:
  - `to`: Your wallet address
  - `amount`: Number of bonds minted
  - `opportunityId`: Investment opportunity ID

## 📊 Key Information Locations

| Information | Where to Find |
|------------|---------------|
| **Total Bonds Issued** | Contract page → Read Contract → `totalBondsIssued()` |
| **Your Bond Balance** | Your wallet → Token Holdings → Find bond token |
| **Bond Price** | Contract page → Read Contract → `bondPrice()` |
| **Maturity Date** | Contract page → Read Contract → `maturityDate()` |
| **Coupon Rate** | Contract page → Read Contract → `couponRate()` |
| **All Bond Holders** | Contract page → Holders tab |
| **Minting History** | Contract page → Events tab → `BondsMinted` events |
| **All Transfers** | Contract page → Token Transfers tab |

## 🔍 Step-by-Step: Finding Your Bonds

1. **Get your contract address** from the admin panel or API
2. **Open contract page**: `https://testnet.sonicscan.org/address/CONTRACT_ADDRESS`
3. **Click "Read Contract"** → Scroll down to see:
   - `totalBondsIssued()` - Click to see total bonds
   - `bondPrice()` - Click to see price per bond
   - `maturityDate()` - Click to see maturity date
   - `couponRate()` - Click to see interest rate
4. **Click "Events" tab** → Filter by `BondsMinted`
5. **Click "Holders" tab** → See all bond holders and their balances

## 💡 Understanding the Data

### Token Balance vs Bond Count
- **Explorer shows**: Token balance in base units (wei)
- **Your bond count**: `tokenBalance / bondPrice`
- **Example**: 
  - Token balance: `100000000000000000000` (100 tokens with 18 decimals)
  - Bond price: `100000000000000000000` (100 tokens)
  - **Your bonds**: `100 / 100 = 1 bond`

### Reading Events
- **BondsMinted event**: Shows `amount` in **bond count** (not token units)
- **Transfer event**: Shows `value` in **token units** (bonds × bondPrice)

## 🚀 Quick Check via API

You can also check bond details via API:

```bash
# Get contract info (includes explorer URL)
GET /api/blockchain/contract-info/:opportunityId

# Get your bond balance
GET /api/blockchain/bond-balance/:opportunityId/:walletAddress

# Get all your holdings
GET /api/blockchain/user-holdings/:walletAddress
```

## 📝 Example

If your contract address is `0x1234...5678`:

1. **Contract page**: `https://testnet.sonicscan.org/address/0x1234...5678`
2. **Read Contract** → `totalBondsIssued()` → Shows: `10` (10 bonds issued)
3. **Events** → `BondsMinted` → Shows your wallet received `5` bonds
4. **Your wallet**: `https://testnet.sonicscan.org/address/YOUR_WALLET`
5. **Token Holdings** → Shows your bond token balance

## ⚠️ Common Confusion

**Q: Why doesn't my wallet balance match my bond count?**
A: The explorer shows token balance (bonds × bondPrice), not bond count. Divide by bondPrice to get actual bond count.

**Q: Where do I see the maturity date?**
A: Contract page → Read Contract → `maturityDate()` → Convert Unix timestamp to date

**Q: How do I verify bonds were minted?**
A: Contract page → Events tab → Look for `BondsMinted` event with your wallet address in the `to` field

**Q: Where do I get the contract address?**
A: 
- **Easiest**: Admin Panel → Blockchain tab → Contract Address column
- **API**: `GET /api/blockchain/contract-info/:opportunityId`
- **Admin Panel**: Investment Opportunities → Contract Address field
- **From Transaction**: Transaction page → "To" address is the contract

## 📋 Quick Checklist

✅ **Step 1**: Get contract address (see Step 0 above)
✅ **Step 2**: Go to `https://testnet.sonicscan.org/address/CONTRACT_ADDRESS`
✅ **Step 3**: Click "Read Contract" to see bond details
✅ **Step 4**: Click "Events" tab to see minting history
✅ **Step 5**: Click "Holders" tab to see all bond holders

