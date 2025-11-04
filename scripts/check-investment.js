#!/usr/bin/env node

/**
 * Quick script to check your bond investment on the blockchain
 * 
 * Usage:
 *   node scripts/check-investment.js <wallet-address> [jwt-token]
 * 
 * Example:
 *   node scripts/check-investment.js 0x1234... abc123...
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

async function checkHoldings(walletAddress, jwtToken) {
  if (!walletAddress) {
    console.error('❌ Error: Wallet address is required');
    console.log('\nUsage: node scripts/check-investment.js <wallet-address> [jwt-token]');
    process.exit(1);
  }

  if (!jwtToken) {
    console.warn('⚠️  Warning: No JWT token provided. Some endpoints may require authentication.');
  }

  try {
    console.log(`\n🔍 Checking bond holdings for: ${walletAddress}\n`);
    console.log(`📡 API: ${API_BASE_URL}\n`);

    // Get user holdings
    const headers = jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {};
    
    const response = await axios.get(
      `${API_BASE_URL}/blockchain/user-holdings/${walletAddress}`,
      { headers }
    );

    if (response.data.success && response.data.data.length > 0) {
      console.log('✅ Bond Holdings Found:\n');
      console.log('='.repeat(60));
      
      response.data.data.forEach((holding, index) => {
        console.log(`\n${index + 1}. ${holding.opportunityTitle}`);
        console.log(`   Company: ${holding.company}`);
        console.log(`   Bonds: ${holding.bonds}`);
        console.log(`   Contract: ${holding.contractAddress}`);
        
        // Determine explorer URL based on network
        const network = process.env.BLOCKCHAIN_NETWORK || 'testnet';
        const explorerBase = network === 'mainnet' 
          ? 'https://sonicscan.org' 
          : 'https://testnet.sonicscan.org';
        
        console.log(`   Explorer: ${explorerBase}/address/${holding.contractAddress}`);
        console.log(`   Opportunity ID: ${holding.opportunityId}`);
      });
      
      console.log('\n' + '='.repeat(60));
      console.log(`\n✨ Total Opportunities: ${response.data.data.length}`);
      console.log(`💰 Total Bonds: ${response.data.data.reduce((sum, h) => sum + h.bonds, 0)}\n`);
    } else {
      console.log('ℹ️  No bond holdings found for this address.');
      console.log('\nPossible reasons:');
      console.log('  - Bonds haven\'t been minted yet');
      console.log('  - Contract not deployed for this opportunity');
      console.log('  - Wrong wallet address');
      console.log('  - Investment not completed\n');
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.statusText);
      console.error('   Message:', error.response.data?.message || error.response.data);
    } else if (error.request) {
      console.error('❌ Network Error: Could not reach the API');
      console.error('   Make sure the backend server is running at:', API_BASE_URL);
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

// Get arguments from command line
const walletAddress = process.argv[2];
const jwtToken = process.argv[3];

checkHoldings(walletAddress, jwtToken);

