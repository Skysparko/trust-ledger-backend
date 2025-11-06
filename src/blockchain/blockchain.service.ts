import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { BlockchainConfig } from './blockchain.config';

// BondToken contract ABI (minimal interface for deployment and interaction)
const BOND_TOKEN_ABI = [
  // Constructor
  'constructor(string memory _name, string memory _symbol, string memory _opportunityId, uint256 _maturityDate, uint256 _couponRate, uint256 _bondPrice, address _owner)',
  
  // ERC20 functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  
  // Bond-specific functions
  'function opportunityId() view returns (string)',
  'function maturityDate() view returns (uint256)',
  'function couponRate() view returns (uint256)',
  'function bondPrice() view returns (uint256)',
  'function isActive() view returns (bool)',
  'function totalBondsIssued() view returns (uint256)',
  'function mint(address to, uint256 amount)',
  'function burn(address from, uint256 amount)',
  'function payCoupon(address[] recipients, uint256[] amounts)',
  'function getBondBalance(address account) view returns (uint256)',
  'function activate()',
  'function deactivate()',
  'function pause()',
  'function unpause()',
  
  // Events
  'event BondsMinted(address indexed to, uint256 amount, string indexed opportunityId)',
  'event BondsBurned(address indexed from, uint256 amount, string indexed opportunityId)',
  'event CouponPaid(address indexed to, uint256 amount, string indexed opportunityId)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private config: BlockchainConfig;

  constructor(private configService: ConfigService) {
    this.config = new BlockchainConfig(configService);
    this.initializeProvider();
  }

  private initializeProvider() {
    const rpcUrl = this.config.network === 'mainnet' 
      ? this.config.rpcUrl 
      : this.config.testnetRpcUrl;
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
    
    this.logger.log(`Initialized blockchain service for ${this.config.network}`);
    this.logger.log(`RPC URL: ${rpcUrl}`);
    this.logger.log(`Wallet address: ${this.wallet.address}`);
  }

  /**
   * Deploy a BondToken contract for an investment opportunity
   */
  async deployBondToken(
    opportunityId: string,
    name: string,
    symbol: string,
    maturityDate: number, // Unix timestamp
    couponRate: number, // Annual rate in basis points (e.g., 500 = 5%)
    bondPrice: number, // Price per bond (in base units, e.g., 100 = 100 tokens)
  ): Promise<{ contractAddress: string; transactionHash: string }> {
    try {
      this.logger.log(`Deploying BondToken for opportunity ${opportunityId}`);

      // IMPORTANT: To deploy the contract, you need to:
      // 1. Compile the BondToken.sol contract using Hardhat, Foundry, or Remix
      // 2. Get the compiled bytecode and ABI
      // 3. Replace the placeholder bytecode below with the actual compiled bytecode
      // 
      // Example compilation command:
      //   npx hardhat compile
      //   or
      //   forge build
      //
      // Then read the bytecode from the artifacts and use it here:
      
      // TODO: Replace with actual compiled bytecode from contracts/BondToken.sol
      const contractBytecode = process.env.BOND_TOKEN_BYTECODE || '0x';
      
      if (contractBytecode === '0x') {
        throw new BadRequestException(
          'BondToken contract bytecode not configured. Please compile the contract and set BOND_TOKEN_BYTECODE environment variable.'
        );
      }
      
      const contractFactory = new ethers.ContractFactory(
        BOND_TOKEN_ABI,
        contractBytecode,
        this.wallet,
      );

      // Convert parameters
      const maturityTimestamp = BigInt(Math.floor(maturityDate / 1000)); // Convert to seconds
      const couponRateBps = BigInt(couponRate * 100); // Convert percentage to basis points
      const bondPriceWei = ethers.parseUnits(bondPrice.toString(), 18);

      const contract = await contractFactory.deploy(
        name,
        symbol,
        opportunityId,
        maturityTimestamp,
        couponRateBps,
        bondPriceWei,
        this.wallet.address,
      );

      await contract.waitForDeployment();
      const contractAddress = await contract.getAddress();
      const deployTx = contract.deploymentTransaction();

      this.logger.log(`BondToken deployed at ${contractAddress}`);
      this.logger.log(`Transaction hash: ${deployTx?.hash}`);

      return {
        contractAddress,
        transactionHash: deployTx?.hash || '',
      };
    } catch (error) {
      this.logger.error(`Failed to deploy BondToken: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to deploy bond contract: ${error.message}`);
    }
  }

  /**
   * Get the wallet address used for transactions
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get the balance of the wallet in native currency (e.g., SONIC, ETH)
   */
  async getWalletBalance(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      this.logger.error(`Failed to get wallet balance: ${error.message}`, error.stack);
      return '0';
    }
  }

  /**
   * Mint bonds to a user's wallet
   */
  async mintBonds(
    contractAddress: string,
    toAddress: string,
    amount: number, // Number of bonds
  ): Promise<{ transactionHash: string }> {
    try {
      this.logger.log(`Minting ${amount} bonds to ${toAddress}`);
      this.logger.log(`Contract address: ${contractAddress}`);

      // Check wallet balance before attempting transaction
      const balance = await this.getWalletBalance();
      const balanceWei = await this.provider.getBalance(this.wallet.address);
      this.logger.log(`Wallet balance: ${balance} ${this.config.network === 'mainnet' ? 'SONIC' : 'testnet SONIC'}`);

      if (balanceWei === 0n) {
        throw new BadRequestException(
          `Insufficient funds: Wallet ${this.wallet.address} has no native tokens. ` +
          `Please fund this wallet with ${this.config.network === 'mainnet' ? 'SONIC' : 'testnet SONIC'} tokens to pay for gas fees.`
        );
      }

      const contract = new ethers.Contract(contractAddress, BOND_TOKEN_ABI, this.wallet);

      // Estimate gas before sending transaction
      try {
        const gasEstimate = await contract.mint.estimateGas(toAddress, amount);
        const gasPrice = await this.provider.getFeeData();
        const estimatedCost = gasEstimate * (gasPrice.gasPrice || gasPrice.maxFeePerGas || 0n);
        
        this.logger.log(`Estimated gas: ${gasEstimate.toString()}, Estimated cost: ${ethers.formatEther(estimatedCost)} ${this.config.network === 'mainnet' ? 'SONIC' : 'testnet SONIC'}`);
        
        if (balanceWei < estimatedCost) {
          throw new BadRequestException(
            `Insufficient funds: Wallet ${this.wallet.address} has ${balance} ${this.config.network === 'mainnet' ? 'SONIC' : 'testnet SONIC'}, ` +
            `but needs approximately ${ethers.formatEther(estimatedCost)} ${this.config.network === 'mainnet' ? 'SONIC' : 'testnet SONIC'} for gas fees. ` +
            `Please fund this wallet with more native tokens.`
          );
        }
      } catch (gasError) {
        // If gas estimation fails, proceed anyway - it might be due to contract state
        this.logger.warn(`Gas estimation failed: ${gasError.message}. Proceeding with transaction.`);
      }

      const tx = await contract.mint(toAddress, amount);
      const receipt = await tx.wait();

      this.logger.log(`Bonds minted successfully. TX: ${receipt.hash}`);

      return {
        transactionHash: receipt.hash,
      };
    } catch (error) {
      // Improve error messages for insufficient funds
      if (error.message?.includes('insufficient funds') || error.code === 'INSUFFICIENT_FUNDS') {
        const balance = await this.getWalletBalance();
        this.logger.error(`Failed to mint bonds: Insufficient funds in wallet ${this.wallet.address}. Current balance: ${balance} ${this.config.network === 'mainnet' ? 'SONIC' : 'testnet SONIC'}`);
        throw new BadRequestException(
          `Insufficient funds: The wallet ${this.wallet.address} does not have enough ${this.config.network === 'mainnet' ? 'SONIC' : 'testnet SONIC'} tokens to pay for gas fees. ` +
          `Current balance: ${balance} ${this.config.network === 'mainnet' ? 'SONIC' : 'testnet SONIC'}. ` +
          `Please fund this wallet with native tokens to continue.`
        );
      }
      
      this.logger.error(`Failed to mint bonds: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to mint bonds: ${error.message}`);
    }
  }

  /**
   * Check if a contract exists at the given address
   */
  async contractExists(contractAddress: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(contractAddress);
      return code !== '0x' && code !== null && code.length > 2;
    } catch (error) {
      this.logger.warn(`Failed to check contract existence at ${contractAddress}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get bond balance for an address
   */
  async getBondBalance(
    contractAddress: string,
    address: string,
  ): Promise<number> {
    try {
      // Validate contract address
      if (!contractAddress || !ethers.isAddress(contractAddress)) {
        this.logger.warn(`Invalid contract address: ${contractAddress}`);
        return 0;
      }

      // Check if contract exists
      const exists = await this.contractExists(contractAddress);
      if (!exists) {
        this.logger.warn(`Contract does not exist at address ${contractAddress}`);
        return 0;
      }

      // Validate wallet address
      if (!address || !ethers.isAddress(address)) {
        this.logger.warn(`Invalid wallet address: ${address}`);
        return 0;
      }

      const contract = new ethers.Contract(contractAddress, BOND_TOKEN_ABI, this.provider);
      const balance = await contract.getBondBalance(address);
      return Number(balance);
    } catch (error: any) {
      // Check for specific error types
      if (error.message?.includes('could not decode result data') || error.code === 'BAD_DATA') {
        this.logger.warn(
          `Contract at ${contractAddress} may not have getBondBalance function or contract is not a BondToken contract`
        );
      } else {
        this.logger.error(
          `Failed to get bond balance for ${address} from contract ${contractAddress}: ${error.message}`,
          error.stack
        );
      }
      return 0;
    }
  }

  /**
   * Get token balance (in wei) for an address
   */
  async getTokenBalance(
    contractAddress: string,
    address: string,
  ): Promise<string> {
    try {
      // Validate contract address
      if (!contractAddress || !ethers.isAddress(contractAddress)) {
        this.logger.warn(`Invalid contract address: ${contractAddress}`);
        return '0';
      }

      // Check if contract exists
      const exists = await this.contractExists(contractAddress);
      if (!exists) {
        this.logger.warn(`Contract does not exist at address ${contractAddress}`);
        return '0';
      }

      // Validate wallet address
      if (!address || !ethers.isAddress(address)) {
        this.logger.warn(`Invalid wallet address: ${address}`);
        return '0';
      }

      const contract = new ethers.Contract(contractAddress, BOND_TOKEN_ABI, this.provider);
      const balance = await contract.balanceOf(address);
      return balance.toString();
    } catch (error: any) {
      // Check for specific error types
      if (error.message?.includes('could not decode result data') || error.code === 'BAD_DATA') {
        this.logger.warn(
          `Contract at ${contractAddress} may not have balanceOf function or contract is not an ERC20 contract`
        );
      } else {
        this.logger.error(
          `Failed to get token balance for ${address} from contract ${contractAddress}: ${error.message}`,
          error.stack
        );
      }
      return '0';
    }
  }

  /**
   * Transfer bonds between addresses
   */
  async transferBonds(
    contractAddress: string,
    fromAddress: string,
    toAddress: string,
    amount: number, // Number of bonds
  ): Promise<{ transactionHash: string }> {
    try {
      this.logger.log(`Transferring ${amount} bonds from ${fromAddress} to ${toAddress}`);

      const contract = new ethers.Contract(contractAddress, BOND_TOKEN_ABI, this.wallet);
      
      // Get bond price to calculate token amount
      const bondPrice = await contract.bondPrice();
      const tokenAmount = BigInt(amount) * bondPrice;

      const tx = await contract.transferFrom(fromAddress, toAddress, tokenAmount);
      const receipt = await tx.wait();

      this.logger.log(`Bonds transferred successfully. TX: ${receipt.hash}`);

      return {
        transactionHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to transfer bonds: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to transfer bonds: ${error.message}`);
    }
  }

  /**
   * Pay coupon to bond holders (mock payment)
   */
  async payCoupon(
    contractAddress: string,
    recipients: string[],
    amounts: string[], // Amounts in wei
  ): Promise<{ transactionHash: string }> {
    try {
      this.logger.log(`Paying coupons to ${recipients.length} recipients`);

      const contract = new ethers.Contract(contractAddress, BOND_TOKEN_ABI, this.wallet);
      const amountsBigInt = amounts.map((amt) => BigInt(amt));

      const tx = await contract.payCoupon(recipients, amountsBigInt);
      const receipt = await tx.wait();

      this.logger.log(`Coupons paid successfully. TX: ${receipt.hash}`);

      return {
        transactionHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Failed to pay coupons: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to pay coupons: ${error.message}`);
    }
  }

  /**
   * Get contract information
   */
  async getContractInfo(contractAddress: string) {
    try {
      const contract = new ethers.Contract(contractAddress, BOND_TOKEN_ABI, this.provider);
      
      const [name, symbol, opportunityId, maturityDate, couponRate, bondPrice, isActive, totalBonds] = 
        await Promise.all([
          contract.name(),
          contract.symbol(),
          contract.opportunityId(),
          contract.maturityDate(),
          contract.couponRate(),
          contract.bondPrice(),
          contract.isActive(),
          contract.totalBondsIssued(),
        ]);

      return {
        contractAddress,
        name,
        symbol,
        opportunityId,
        maturityDate: Number(maturityDate) * 1000, // Convert to milliseconds
        couponRate: Number(couponRate) / 100, // Convert from basis points to percentage
        bondPrice: ethers.formatEther(bondPrice),
        isActive,
        totalBondsIssued: Number(totalBonds),
      };
    } catch (error) {
      this.logger.error(`Failed to get contract info: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get contract info: ${error.message}`);
    }
  }

  /**
   * Listen to contract events
   */
  setupEventListeners(contractAddress: string, callback: (event: any) => void) {
    const contract = new ethers.Contract(contractAddress, BOND_TOKEN_ABI, this.provider);

    contract.on('BondsMinted', (to, amount, opportunityId, event) => {
      this.logger.log(`BondsMinted event: ${amount} bonds to ${to}`);
      callback({
        type: 'BondsMinted',
        to,
        amount: amount.toString(),
        opportunityId,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      });
    });

    contract.on('BondsBurned', (from, amount, opportunityId, event) => {
      this.logger.log(`BondsBurned event: ${amount} bonds from ${from}`);
      callback({
        type: 'BondsBurned',
        from,
        amount: amount.toString(),
        opportunityId,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      });
    });

    contract.on('CouponPaid', (to, amount, opportunityId, event) => {
      this.logger.log(`CouponPaid event: ${amount} to ${to}`);
      callback({
        type: 'CouponPaid',
        to,
        amount: amount.toString(),
        opportunityId,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      });
    });

    contract.on('Transfer', (from, to, value, event) => {
      this.logger.log(`Transfer event: ${value} from ${from} to ${to}`);
      callback({
        type: 'Transfer',
        from,
        to,
        value: value.toString(),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      });
    });
  }

  /**
   * Get explorer URL for a transaction
   */
  getExplorerUrl(transactionHash: string): string {
    return `${this.config.explorerUrl}/tx/${transactionHash}`;
  }

  /**
   * Get explorer URL for a contract
   */
  getContractExplorerUrl(contractAddress: string): string {
    return `${this.config.explorerUrl}/address/${contractAddress}`;
  }
}

