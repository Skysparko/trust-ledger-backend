import { ethers } from 'ethers';
import { config } from 'dotenv';

// Load environment variables
config();

async function checkWalletBalance() {
  try {
    // Get configuration from environment
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    const network = process.env.BLOCKCHAIN_NETWORK || 'testnet';
    const rpcUrl = network === 'mainnet'
      ? process.env.SONIC_RPC_URL || 'https://rpc.soniclabs.com'
      : process.env.SONIC_TESTNET_RPC_URL || 'https://rpc.testnet.soniclabs.com';
    
    if (!privateKey) {
      console.error('❌ ERROR: BLOCKCHAIN_PRIVATE_KEY not found in environment variables');
      console.log('\nPlease set BLOCKCHAIN_PRIVATE_KEY in your .env file');
      process.exit(1);
    }

    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Get balance
    const balance = await provider.getBalance(wallet.address);
    const balanceFormatted = ethers.formatEther(balance);

    // Get network info
    const networkName = network === 'mainnet' ? 'Sonic Mainnet' : 'Sonic Testnet';
    const tokenSymbol = network === 'mainnet' ? 'SONIC' : 'testnet SONIC';
    const explorerUrl = network === 'mainnet'
      ? 'https://sonicscan.org'
      : 'https://testnet.sonicscan.org';

    // Display results
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  Wallet Balance Check');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`Network:        ${networkName}`);
    console.log(`Wallet Address: ${wallet.address}`);
    console.log(`Balance:        ${balanceFormatted} ${tokenSymbol}`);
    console.log(`\nExplorer URL:   ${explorerUrl}/address/${wallet.address}`);
    console.log('\n═══════════════════════════════════════════════════════\n');

    // Warning if balance is low or zero
    if (balance === 0n) {
      console.log('⚠️  WARNING: Your wallet has ZERO balance!');
      console.log('\nTo get testnet tokens:');
      console.log('1. Visit the Sonic testnet explorer: https://testnet.sonicscan.org');
      console.log('2. Look for a "Faucet" link or button');
      console.log('3. Enter your wallet address and request tokens');
      console.log(`4. Or use this address: ${wallet.address}`);
      console.log('\nNote: Even testnets require tokens to pay for gas fees!');
      console.log('      Testnet tokens are FREE - you just need to request them from a faucet.\n');
    } else if (parseFloat(balanceFormatted) < 0.01) {
      console.log('⚠️  WARNING: Your wallet balance is very low!');
      console.log('Consider getting more testnet tokens from a faucet to avoid running out.\n');
    } else {
      console.log('✅ Your wallet has sufficient balance for transactions.\n');
    }

  } catch (error) {
    console.error('❌ Error checking wallet balance:', error.message);
    
    if (error.message.includes('network')) {
      console.log('\n💡 Tip: Check your RPC URL configuration in .env');
      console.log('   For testnet: SONIC_TESTNET_RPC_URL');
      console.log('   For mainnet: SONIC_RPC_URL');
    }
    
    process.exit(1);
  }
}

// Run the check
checkWalletBalance();

