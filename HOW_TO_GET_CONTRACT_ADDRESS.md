# How to Get the Contract Address

The **contract address** is a **NEW address** automatically created by the blockchain when you deploy a contract. It's **different from your wallet address**.

## 🔑 Key Concept

- **Wallet Address** (`0xF83F8282...1D0af1723`): Your admin wallet that deploys contracts
- **Contract Address** (`0x...`): A NEW address created when the contract is deployed
- They are **NEVER the same** - if they are, something went wrong!

## 📍 Where to Get the Contract Address

### Method 1: From Deployment API Response (Easiest)

When you deploy a contract, the API automatically returns the contract address:

```bash
POST /api/blockchain/deploy-bond-token
{
  "opportunityId": "your-opportunity-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contractAddress": "0x1234567890abcdef1234567890abcdef12345678",  // ← THIS IS IT!
    "transactionHash": "0x...",
    "explorerUrl": "https://testnet.sonicscan.org/address/0x1234..."
  }
}
```

**The contract address is automatically saved to the database** - you don't need to do anything!

### Method 2: From Admin Panel

1. Go to **Admin Panel** → **Investment Opportunities**
2. Find your investment opportunity
3. Look for the **"Contract Address"** field
4. This is the contract address (if it's deployed)

### Method 3: From Blockchain Tab

1. Go to **Admin Panel** → **Blockchain** tab
2. Find your investment
3. The **"Contract Address"** column shows the contract address
4. Click the explorer icon to view it on SonicScan

### Method 4: From Deployment Transaction

If you have the deployment transaction hash:

1. **Using API:**
   ```bash
   GET /api/blockchain/contract-from-tx/YOUR_DEPLOYMENT_TX_HASH
   ```
   Returns the contract address from the transaction.

2. **Using Explorer:**
   - Go to: `https://testnet.sonicscan.org/tx/YOUR_DEPLOYMENT_TX_HASH`
   - Look for **"Contract Creation"** section
   - The **"Created Contract Address"** is your contract address
   - Or check the transaction receipt - `contractAddress` field

### Method 5: From Contract Info API

```bash
GET /api/blockchain/contract-info/:opportunityId
```

Returns:
```json
{
  "success": true,
  "data": {
    "contractAddress": "0x...",
    "name": "...",
    "symbol": "...",
    "explorerUrl": "..."
  }
}
```

## ⚠️ Common Mistake: Wrong Address Stored

If you see an error like:
```
Contract does not exist at 0xF83F8282...1D0af1723
```

And `0xF83F8282...1D0af1723` is your **admin wallet address**, this means:
- ❌ The wrong address was saved (wallet address instead of contract address)
- ✅ **Solution:** Redeploy the contract to get the correct address

## 🔍 How to Verify Contract Address is Correct

1. **Check it's different from wallet address:**
   - Contract address ≠ Wallet address
   - If they're the same, it's wrong!

2. **Check on explorer:**
   - Go to: `https://testnet.sonicscan.org/address/YOUR_CONTRACT_ADDRESS`
   - Should show "Contract" (not just a wallet)
   - Should have "Read Contract" tab
   - Should show contract code

3. **Check it has code:**
   - Use API: `GET /api/blockchain/wallet-info` to get your wallet address
   - Compare: Contract address should be different

## 🚀 Quick Steps to Get Contract Address

1. **Deploy the contract:**
   ```bash
   POST /api/blockchain/deploy-bond-token
   {
     "opportunityId": "your-opportunity-id"
   }
   ```

2. **Copy the contract address** from the response

3. **Verify it's saved:**
   - Check Admin Panel → Investment Opportunities
   - Contract Address field should be populated

4. **Verify it's correct:**
   - Should be different from your wallet address
   - Should exist on the blockchain (check explorer)

## 📝 Example

**Admin Wallet:** `0xF83F8282171C520234e6D6dd37b8Aaf1D0af1723`  
**Contract Address:** `0x1234567890abcdef1234567890abcdef12345678` ← Different!

When you deploy:
- Admin wallet sends transaction → Creates new contract
- Blockchain creates new address → This is your contract address
- Contract address is returned → Saved automatically

## 🆘 If Contract Address is Missing

1. **Check if contract was deployed:**
   - Look for deployment transaction hash
   - Check backend logs for deployment success

2. **Redeploy if needed:**
   - If address is wrong or missing, redeploy
   - The new validation will prevent saving wrong addresses

3. **Get from transaction:**
   - If you have deployment TX hash, use:
     `GET /api/blockchain/contract-from-tx/TX_HASH`

