# How to Check Your Bond Investment on Blockchain

After investing in a bond, you can verify it's recorded on the Sonic blockchain in several ways:

## Method 1: Using API Endpoints (Recommended)

### 1. Get All Your Holdings
```bash
# Replace YOUR_WALLET_ADDRESS with your actual wallet address
# Replace YOUR_JWT_TOKEN with your authentication token

curl -X GET "http://localhost:3000/api/blockchain/user-holdings/YOUR_WALLET_ADDRESS" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

This will return all your bond holdings across all investment opportunities.

### 2. Check Balance for Specific Opportunity
```bash
# Replace OPPORTUNITY_ID with the investment opportunity ID
# Replace YOUR_WALLET_ADDRESS with your wallet address

curl -X GET "http://localhost:3000/api/blockchain/bond-balance/OPPORTUNITY_ID/YOUR_WALLET_ADDRESS" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Get Contract Information
```bash
# Replace OPPORTUNITY_ID with the investment opportunity ID

curl -X GET "http://localhost:3000/api/blockchain/contract-info/OPPORTUNITY_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

This returns contract details including:
- Contract address
- Total bonds issued
- Explorer URL (to view on blockchain explorer)

## Method 2: Using Blockchain Explorer Directly

### Step 1: Get Your Contract Address

You can get the contract address from several places:

#### Option A: Using API (Easiest)
```bash
# Get contract info for a specific investment opportunity
GET /api/blockchain/contract-info/:opportunityId

# Response includes:
{
  "success": true,
  "data": {
    "contractAddress": "0x1234...5678",
    "name": "Bond Name",
    "symbol": "BOND",
    "explorerUrl": "https://testnet.sonicscan.org/address/0x1234...5678",
    ...
  }
}
```

#### Option B: From Admin Panel
1. Go to **Admin Panel** → **Investment Opportunities**
2. Find the investment opportunity
3. Look for the **"Contract Address"** field
4. It should look like: `0x1234567890abcdef1234567890abcdef12345678`

#### Option C: From Your Investments
1. Go to **Admin Panel** → **Blockchain** tab
2. Find your investment in the list
3. The **"Contract Address"** column shows the contract address

#### Option D: From Your Holdings API
```bash
# Get all your holdings (includes contract addresses)
GET /api/blockchain/user-holdings/:walletAddress

# Response includes:
{
  "success": true,
  "data": [
    {
      "opportunityId": "...",
      "opportunityTitle": "...",
      "contractAddress": "0x1234...5678",
      "bonds": 10
    }
  ]
}
```

#### Option E: From Investment Transaction
If you have the mint transaction hash, you can:
1. Go to: `https://testnet.sonicscan.org/tx/YOUR_TRANSACTION_HASH`
2. Look at the transaction details
3. The **"To"** address is the contract address (where the transaction was sent)

**Note:** If you don't see a contract address, it means the bond contract hasn't been deployed yet for that investment opportunity. The admin needs to deploy it first using:
```bash
POST /api/blockchain/deploy-bond-token
```

### Step 2: View on Sonic Explorer

#### A. View Contract Details (Bond Token Contract)

1. **For Testnet:**
   - Go to: `https://testnet.sonicscan.org/address/YOUR_CONTRACT_ADDRESS`
   - Replace `YOUR_CONTRACT_ADDRESS` with your bond contract address

2. **For Mainnet:**
   - Go to: `https://sonicscan.org/address/YOUR_CONTRACT_ADDRESS`

**What You'll See on the Contract Page:**

1. **Overview Tab:**
   - Contract address
   - Total token supply
   - Contract creator and deployment transaction

2. **Transactions Tab:**
   - All minting transactions (`mint` function calls)
   - Transfer transactions
   - Contract deployment transaction

3. **Token Transfers Tab:**
   - Every time bonds were minted to a wallet
   - Every bond transfer between wallets
   - Shows: From → To, Amount, Transaction hash

4. **Events Tab:**
   - **BondsMinted** events - Shows when bonds were minted
     - `to` address (wallet that received bonds)
     - `amount` (number of bonds minted)
     - `opportunityId` (investment opportunity ID)
   - **BondsBurned** events - Shows when bonds were burned
   - **Transfer** events - Standard ERC20 transfers
   - **CouponPaid** events - Shows coupon payments

5. **Contract Tab (Read Contract):**
   - Click "Read Contract" to see contract state:
     - `opportunityId()` - UUID of the investment opportunity
     - `maturityDate()` - Unix timestamp when bonds mature
     - `couponRate()` - Annual interest rate in basis points
     - `bondPrice()` - Price per bond in wei
     - `isActive()` - Whether bond issuance is active
     - `totalBondsIssued()` - Total number of bonds issued
     - `name()` - Token name
     - `symbol()` - Token symbol
     - `totalSupply()` - Total token supply (bonds × bondPrice)

6. **Holders Tab:**
   - Lists all wallet addresses that hold bonds
   - Shows token balance for each holder
   - **Note:** The balance shown is in token units (bonds × bondPrice), not number of bonds

#### B. View Your Wallet Address

1. **For Testnet:**
   - Go to: `https://testnet.sonicscan.org/address/YOUR_WALLET_ADDRESS`
   - Replace `YOUR_WALLET_ADDRESS` with your wallet address

2. **For Mainnet:**
   - Go to: `https://sonicscan.org/address/YOUR_WALLET_ADDRESS`

**What You'll See on Your Wallet Page:**

1. **Token Holdings Tab:**
   - Shows all ERC20 tokens you hold (including your bond tokens)
   - Token name, symbol, and balance
   - **Note:** Balance shown is in token units (bonds × bondPrice)
   - To get actual bond count: `balance / bondPrice`

2. **Transactions Tab:**
   - All transactions involving your wallet
   - Look for:
     - **Mint transactions** - When bonds were minted to your wallet
     - **Transfer transactions** - When you received/sent bonds

3. **Token Transfers Tab:**
   - All ERC20 token transfers to/from your wallet
   - Shows the bond token transfers

#### C. View the Mint Transaction

1. From your wallet page, click on the mint transaction hash
2. Or go directly to: `https://testnet.sonicscan.org/tx/YOUR_TRANSACTION_HASH`

**What You'll See:**
- Transaction status (Success/Failed)
- Block number and timestamp
- From/To addresses
- Gas used
- **Events Logs:**
  - `BondsMinted` event with:
    - `to` address (your wallet)
    - `amount` (number of bonds)
    - `opportunityId`
- **Input Data:** Shows the function called (`mint`) and parameters

### Step 3: Understanding the Data

**Important Notes:**

1. **Token Balance vs Bond Count:**
   - The explorer shows token balance in wei/base units
   - Your actual bond count = `tokenBalance / bondPrice`
   - Example: If balance is `100000000000000000000` (100 tokens) and bondPrice is `100000000000000000000` (100 tokens), you have 1 bond

2. **Reading Contract State:**
   - Use the "Read Contract" section to see:
     - Total bonds issued across all investors
     - Bond price, maturity date, coupon rate
     - Whether the contract is active

3. **Finding Your Bond Holdings:**
   - Go to your wallet address → Token Holdings tab
   - Find your bond token (identified by contract address)
   - The balance shown is in token units, not bond count

4. **Verifying Minting:**
   - Check Events tab on contract page for `BondsMinted` events
   - Verify your wallet address is in the `to` field
   - Check the `amount` matches your investment

## Method 3: Using MetaMask Wallet

1. **Connect to Sonic Network:**
   - Open MetaMask
   - Add Custom Network:
     - **Network Name:** Sonic Testnet (or Mainnet)
     - **RPC URL:** `https://rpc.testnet.sonicscan.org` (testnet) or `https://rpc.soniclabs.com` (mainnet)
     - **Chain ID:** `64165` (testnet) or `146` (mainnet)
     - **Currency Symbol:** `S`
     - **Block Explorer:** `https://testnet.sonicscan.org` or `https://sonicscan.org`

2. **Add Token to MetaMask:**
   - Go to MetaMask → Assets → Import Tokens
   - Enter your contract address (from Method 1, Step 3)
   - MetaMask will auto-detect token details
   - Click "Add Custom Token"

3. **View Your Balance:**
   - Your bond tokens will appear in MetaMask
   - The balance shows the number of bond tokens you own

## Method 4: Using Frontend Component

If you want to add a holdings view to your frontend:

1. **Add BondHoldings Component** to any page:
```tsx
import { BondHoldings } from '@/components/wallet/BondHoldings';

// In your component
<BondHoldings />
```

2. **Make sure wallet is connected** - The component automatically:
   - Detects your connected wallet address
   - Fetches all your holdings
   - Displays them with contract addresses

## Method 5: Quick Verification Script

Create a file `check-investment.js`:

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const YOUR_WALLET_ADDRESS = '0x...'; // Your wallet address
const YOUR_JWT_TOKEN = 'your-jwt-token-here';

async function checkHoldings() {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/blockchain/user-holdings/${YOUR_WALLET_ADDRESS}`,
      {
        headers: {
          'Authorization': `Bearer ${YOUR_JWT_TOKEN}`
        }
      }
    );

    if (response.data.success) {
      console.log('Your Bond Holdings:');
      console.log(JSON.stringify(response.data.data, null, 2));
      
      response.data.data.forEach((holding) => {
        console.log(`\n${holding.opportunityTitle} (${holding.company})`);
        console.log(`  Bonds: ${holding.bonds}`);
        console.log(`  Contract: ${holding.contractAddress}`);
        console.log(`  Explorer: https://testnet.sonicscan.org/address/${holding.contractAddress}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkHoldings();
```

Run it:
```bash
node check-investment.js
```

## What to Look For

When verifying your investment:

1. **Contract Address:** Should match the one stored in the investment opportunity
2. **Bond Balance:** Should match the number of bonds you invested in
3. **Transaction Hash:** Look for the minting transaction that created your bonds
4. **Events:** Check for "BondsMinted" events with your wallet address

## Troubleshooting

### "No Matching Entries" in Token Transfers Tab

**Symptom:** You see "There are no matching entries" when clicking "Token Transfers (ERC-20)" on your wallet address page, but you DO see transactions in the "Transactions" tab.

**Understanding the Difference:**
- **"Transactions" tab**: Shows ALL transactions (native S token transfers, contract calls, etc.)
- **"Token Transfers (ERC-20)" tab**: Shows ONLY ERC-20 token transfers (bond minting/transfers)

**Why you see transactions but no token transfers:**
- The transactions you see might be native S token transfers (funding your wallet)
- The mint transaction might be one of those transactions, but it's not showing as a token transfer yet
- OR the mint transaction hasn't happened yet

**This means:**
- No ERC-20 tokens (including bonds) have been transferred to/from this wallet address
- OR bonds haven't been minted yet
- OR bonds were minted to a different wallet address
- OR the explorer hasn't indexed the token transfer yet (wait a few minutes)

**How to Verify:**

1. **Check if bonds were minted at all:**
   - Get the contract address from Admin Panel → Blockchain tab
   - Go to: `https://testnet.sonicscan.org/address/YOUR_CONTRACT_ADDRESS`
   - Click **"Events"** tab
   - Look for `BondsMinted` events
   - Check if your wallet address is in the `to` field

2. **Verify the wallet address:**
   - Check Admin Panel → Blockchain tab → Find your investment
   - Verify the "Wallet Address" column matches the address you're checking
   - Make sure you're checking the correct wallet address

3. **Check if investment was confirmed:**
   - Bonds are only minted when admin confirms the investment
   - Check Admin Panel → Transactions → Find your investment
   - Status should be "CONFIRMED" (not "PENDING")
   - Look for "Mint Tx Hash" - if it's empty, bonds weren't minted

4. **Identify the mint transaction from your wallet transactions:**
   - In the "Transactions" tab, look for transactions where:
     - **"To"** address is the **bond contract address** (not your wallet)
     - **"Method"** shows `mint` or a contract interaction
     - Click on that transaction to see details
   - On the transaction detail page:
     - Check **"To"** address - should be the bond contract address
     - Check **Events Logs** - should show `BondsMinted` event
     - In the event, check the `to` field - should be your wallet address
     - Check the `amount` field - should show number of bonds minted

6. **Check the mint transaction directly:**
   - Get the mint transaction hash from Admin Panel → Blockchain tab → "Mint Tx Hash" column
   - Go to: `https://testnet.sonicscan.org/tx/YOUR_MINT_TX_HASH`
   - Verify the transaction was successful (Status: Success)
   - Check the **"To"** address - should be the bond contract address
   - Check the **Events Logs** for `BondsMinted` event:
     - `to`: Your wallet address
     - `amount`: Number of bonds minted
     - `opportunityId`: Investment opportunity ID

7. **Wait for indexing:**
   - Sometimes the explorer takes a few minutes to index new transactions
   - Try refreshing the page after 2-3 minutes

8. **Verify via API:**
   ```bash
   GET /api/blockchain/user-holdings/YOUR_WALLET_ADDRESS
   ```
   This will tell you if bonds exist on-chain for your wallet

**Common Causes:**
- Investment is still PENDING (not confirmed by admin)
- Bonds were minted to a different wallet address
- Mint transaction failed (check backend logs)
- Explorer hasn't indexed the transaction yet (wait a few minutes)

### No Holdings Found
- Make sure the bond contract was deployed for the opportunity
- Verify your wallet address is correct
- Check that bonds were minted after your investment
- **Most important:** Check if investment was confirmed by admin (bonds only mint on confirmation)

### Contract Not Found
- The admin needs to deploy the bond contract first
- Check if `contractAddress` is set in the investment opportunity

### Wrong Network
- Ensure you're connected to Sonic Testnet (Chain ID: 64165) or Mainnet (Chain ID: 146)
- Check your MetaMask network settings

### RPC Errors
- Verify the RPC URL is correct in your `.env` file
- Test the RPC endpoint: `curl https://rpc.testnet.soniclabs.com`

## Example Response

```json
{
  "success": true,
  "data": [
    {
      "opportunityId": "abc-123",
      "opportunityTitle": "Renewable Energy Project",
      "company": "Green Energy Corp",
      "contractAddress": "0x1234567890abcdef1234567890abcdef12345678",
      "bonds": 10
    }
  ]
}
```

## Next Steps

- View transaction details on the explorer
- Transfer bonds to another address
- Check contract maturity date and coupon rate
- Monitor bond events (minting, transfers, coupon payments)

