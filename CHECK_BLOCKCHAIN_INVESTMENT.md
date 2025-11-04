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
First, get the contract address using Method 1, Step 3 above.

### Step 2: View on Sonic Explorer
1. **For Testnet:**
   - Go to: `https://testnet.sonicscan.org/address/YOUR_CONTRACT_ADDRESS`
   - Or search for your wallet address: `https://testnet.sonicscan.org/address/YOUR_WALLET_ADDRESS`

2. **For Mainnet:**
   - Go to: `https://sonicscan.org/address/YOUR_CONTRACT_ADDRESS`
   - Or search for your wallet address: `https://sonicscan.org/address/YOUR_WALLET_ADDRESS`

### Step 3: View Transactions
- Click on the "Transactions" tab to see all minting transactions
- Look for "BondsMinted" events under the "Events" tab
- Check "Token Transfers" to see your bond tokens

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

### No Holdings Found
- Make sure the bond contract was deployed for the opportunity
- Verify your wallet address is correct
- Check that bonds were minted after your investment

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

