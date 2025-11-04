# Sonic Blockchain Integration

This project integrates the Sonic blockchain for tokenized bond management, similar to Energyblocks.

## Setup

### 1. Environment Variables

Add these to your `.env` file:

```env
# Blockchain Configuration
BLOCKCHAIN_NETWORK=testnet  # or 'mainnet'
SONIC_RPC_URL=https://rpc.testnet.soniclabs.com  # Testnet RPC
SONIC_TESTNET_RPC_URL=https://rpc.testnet.soniclabs.com
BLOCKCHAIN_PRIVATE_KEY=your_private_key_here  # Private key of the deployer wallet (never commit this!)

# Contract Bytecode (after compilation)
BOND_TOKEN_BYTECODE=0x...  # Compiled bytecode from BondToken.sol
```

### 2. Compile Smart Contract

The BondToken contract is located at `contracts/BondToken.sol`. To deploy it:

1. **Using Hardhat:**
   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   npx hardhat compile
   ```
   Copy the bytecode from `artifacts/contracts/BondToken.sol/BondToken.json` and set `BOND_TOKEN_BYTECODE` in `.env`.

2. **Using Foundry:**
   ```bash
   forge install OpenZeppelin/openzeppelin-contracts
   forge build
   ```
   Copy the bytecode from `out/BondToken.sol/BondToken.json` and set `BOND_TOKEN_BYTECODE` in `.env`.

3. **Using Remix:**
   - Open Remix IDE
   - Compile `BondToken.sol`
   - Copy the bytecode from the compilation artifacts
   - Set `BOND_TOKEN_BYTECODE` in `.env`

### 3. Frontend Wallet Setup

Add to your frontend `.env`:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

**Note:** If you're using MetaMask (or other injected wallets), the WalletConnect Project ID is **optional**. MetaMask works directly through the `injected()` and `metaMask()` connectors without requiring WalletConnect.

However, if you want to support WalletConnect (for mobile wallets or as a fallback option), you can get a free Project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com):

1. Go to [cloud.walletconnect.com](https://cloud.walletconnect.com)
2. Sign up or log in (it's free)
3. Create a new project
4. Copy your Project ID
5. Add it to your frontend `.env` file

**For MetaMask users:** You can skip this step if you only plan to use MetaMask. The app will work fine with MetaMask without a WalletConnect Project ID.

## Features

### Backend

- **Deploy Bond Contracts**: Admin can deploy BondToken contracts for investment opportunities
- **Mint Bonds**: Automatically mints bonds to user wallets when investments are created
- **Transfer Bonds**: Users can transfer bonds between wallet addresses
- **Query Holdings**: Query bond balances for any address
- **Contract Info**: Get detailed information about deployed contracts

### Frontend

- **Wallet Connection**: Connect MetaMask, Sonic Wallet, or WalletConnect
- **View Holdings**: Display user's bond holdings across all opportunities
- **Transfer Bonds**: Simple UI to transfer bonds between addresses
- **Investment Flow**: Integrated wallet connection in investment creation

## API Endpoints

### Deploy Bond Token (Admin Only)
```
POST /api/blockchain/deploy-bond-token
Body: {
  opportunityId: string,
  name?: string,
  symbol?: string,
  maturityDate?: number,
  couponRate?: number,
  bondPrice?: number
}
```

### Mint Bonds
```
POST /api/blockchain/mint-bonds
Body: {
  opportunityId: string,
  toAddress: string,
  amount: number
}
```

### Get Bond Balance
```
GET /api/blockchain/bond-balance/:opportunityId/:address
```

### Transfer Bonds
```
POST /api/blockchain/transfer-bonds
Body: {
  opportunityId: string,
  fromAddress: string,
  toAddress: string,
  amount: number
}
```

### Get Contract Info
```
GET /api/blockchain/contract-info/:opportunityId
```

### Get User Holdings
```
GET /api/blockchain/user-holdings/:address
```

## Usage Flow

1. **Admin creates investment opportunity** via admin panel
2. **Admin deploys bond contract** using the deploy endpoint
3. **User connects wallet** in the frontend
4. **User creates investment** - bonds are automatically minted to their wallet
5. **User can view holdings** and transfer bonds

## Notes

- **Mock Payments**: Payment processing is simulated. Real bond tokens are minted on-chain, but payment is not processed.
- **No KYC Required**: All users can buy and transfer bonds without identity checks.
- **Self-Custody**: Users hold their bond tokens directly in their wallets.
- **On-Chain Visibility**: All transactions are visible on Sonic blockchain explorer.

## Troubleshooting

### Contract Deployment Fails
- Ensure `BOND_TOKEN_BYTECODE` is set correctly
- Verify the private key has sufficient funds for gas
- Check RPC endpoint is accessible

### Wallet Connection Issues
- Ensure WalletConnect Project ID is set
- Verify Sonic network is added to wallet (chain ID: 64165 for testnet)
- Check browser console for errors

### Bond Minting Fails
- Ensure investment opportunity has a deployed contract
- Verify user wallet address is valid
- Check backend logs for detailed error messages