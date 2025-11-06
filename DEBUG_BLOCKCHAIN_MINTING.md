# Debugging Blockchain Minting Issues

If you're not seeing data in the blockchain tab after confirming an investment, check the following:

## Common Issues & Solutions

### 1. Contract Not Deployed ❌

**Symptom:** No blockchain data appears after confirming investment

**Check:**
- Does the investment opportunity have a `contractAddress`?
- Admin needs to deploy the bond contract BEFORE approving investments

**Solution:**
1. Go to Admin Panel → Investment Opportunities
2. Find the opportunity
3. Deploy the bond contract using the blockchain API:
   ```
   POST /api/blockchain/deploy-bond-token
   {
     "opportunityId": "your-opportunity-id",
     "name": "Bond Name",
     "symbol": "BOND",
     "couponRate": 5.0,
     "bondPrice": 100
   }
   ```
4. Wait for deployment transaction to complete
5. The `contractAddress` will be saved automatically

### 2. User Has No Wallet Address ❌

**Symptom:** Investment confirmed but no bonds minted

**Check:**
- Does the user have a `walletAddress` in their profile?
- Check user profile: `userProfile.walletAddress`

**Solution:**
1. User must connect their wallet in profile settings
2. Or admin can manually set wallet address via API
3. Wallet must be connected to Sonic network (testnet or mainnet)

### 3. "Could Not Decode Result Data" Error ❌

**Symptom:** Error: `could not decode result data (value="0x")` when querying blockchain

**What This Means:**
- The contract does not exist at the specified address
- The contract address in the database is invalid or incorrect
- The contract was not deployed successfully
- The contract is on a different network than configured

**How to Fix:**

1. **Verify Contract Deployment:**
   ```bash
   # Check if contract exists at address
   GET /api/blockchain/wallet-info
   # Then check the contract on explorer
   # https://testnet.sonicscan.org/address/CONTRACT_ADDRESS
   ```

2. **Check Contract Address:**
   - Go to Admin Panel → Investment Opportunities
   - Check if opportunity has a `contractAddress`
   - Verify the address is valid (starts with `0x`, 42 characters)
   - Check if it matches the deployment transaction

3. **Re-deploy Contract if Needed:**
   - If contract address is missing or invalid, deploy it:
   ```bash
   POST /api/blockchain/deploy-bond-token
   {
     "opportunityId": "your-opportunity-id",
     "name": "Bond Name",
     "symbol": "BOND",
     "couponRate": 5.0,
     "bondPrice": 100
   }
   ```

4. **Verify Network:**
   - Ensure `BLOCKCHAIN_NETWORK` env var matches your deployment network
   - Check RPC URL is correct for the network

5. **Check Backend Logs:**
   - Look for: `Contract does not exist at address...`
   - Look for: `Invalid contract address...`
   - These warnings will tell you which contracts are failing

### 4. Silent Blockchain Errors ❌

**Symptom:** Everything looks correct but no minting happens

**Check Backend Logs:**
Look for these log messages:
- `[BLOCKCHAIN MINT] Starting blockchain minting process`
- `[BLOCKCHAIN MINT] Contract address: ...`
- `[BLOCKCHAIN MINT] User ... wallet address: ...`
- `[BLOCKCHAIN MINT] ❌ FAILED` (if error occurred)

**Common Errors:**
- RPC connection issues
- Insufficient gas/balance in deployer wallet
- Contract bytecode not set (`BOND_TOKEN_BYTECODE` env var)
- Invalid contract address
- Network mismatch

### 5. Verify Blockchain Minting

**Check if minting actually happened:**

1. **Check Investment Record:**
   ```bash
   # Check if investment has mintTxHash and walletAddress
   GET /api/admin/blockchain/investments
   ```

2. **Check Backend Logs:**
   ```bash
   # Look for these log entries:
   [BLOCKCHAIN MINT] ✅ Successfully minted X bonds
   [BLOCKCHAIN MINT] Transaction hash: 0x...
   ```

3. **Check Blockchain Explorer:**
   - Go to: https://testnet.sonicscan.org (or mainnet)
   - Search for the contract address
   - Check "Token Transfers" tab
   - Look for minting transactions

4. **Verify On-Chain Balance:**
   ```bash
   GET /api/blockchain/bond-balance/{opportunityId}/{walletAddress}
   ```

## Quick Diagnostic Checklist

Before confirming an investment, verify:

- [ ] Bond contract is deployed (`contractAddress` exists)
- [ ] User has wallet address (`userProfile.walletAddress` exists)
- [ ] Contract address is valid (starts with `0x`, correct length)
- [ ] Wallet address is valid (starts with `0x`, correct length)
- [ ] Backend RPC is configured correctly (`SONIC_RPC_URL` or `SONIC_TESTNET_RPC_URL`)
- [ ] Deployer wallet has gas (`BLOCKCHAIN_PRIVATE_KEY` wallet has funds)
- [ ] Contract bytecode is set (`BOND_TOKEN_BYTECODE` env var)

## Manual Minting (If Auto-Mint Failed)

If automatic minting failed, you can manually mint:

```bash
POST /api/blockchain/mint-bonds
{
  "opportunityId": "opportunity-id",
  "toAddress": "0x...user-wallet-address",
  "amount": 10  // number of bonds
}
```

## Testing the Flow

1. **Deploy Contract First:**
   ```bash
   POST /api/blockchain/deploy-bond-token
   ```

2. **User Connects Wallet:**
   - User goes to profile
   - Connects MetaMask/Sonic wallet
   - Wallet address saved to profile

3. **Admin Confirms Investment:**
   - Admin approves investment
   - System automatically mints bonds
   - Check logs for `[BLOCKCHAIN MINT]` messages

4. **Verify in Admin Panel:**
   - Go to Admin → Blockchain
   - Should see investment with on-chain data
   - Check "On-Chain Bonds" column

## Environment Variables Required

Make sure these are set in `.env`:

```env
# Blockchain Network
BLOCKCHAIN_NETWORK=testnet  # or 'mainnet'
SONIC_RPC_URL=https://rpc.soniclabs.com
SONIC_TESTNET_RPC_URL=https://rpc.testnet.soniclabs.com

# Deployer Wallet (needs gas for transactions)
BLOCKCHAIN_PRIVATE_KEY=your_private_key_here

# Contract Bytecode (after compilation)
BOND_TOKEN_BYTECODE=0x...  # Compiled bytecode from BondToken.sol
```

## Still Not Working?

1. Check backend console logs for `[BLOCKCHAIN MINT]` messages
2. Verify contract address on blockchain explorer
3. Check user wallet address is correct
4. Try manual minting via API to test
5. Verify RPC endpoint is accessible
6. Check deployer wallet has sufficient balance for gas

