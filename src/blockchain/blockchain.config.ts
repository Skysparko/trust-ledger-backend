import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlockchainConfig {
  constructor(private configService: ConfigService) {}

  get rpcUrl(): string {
    return (
      this.configService.get<string>('SONIC_RPC_URL') ||
      'https://rpc.soniclabs.com' // Default Sonic mainnet RPC
    );
  }

  get testnetRpcUrl(): string {
    return (
      this.configService.get<string>('SONIC_TESTNET_RPC_URL') ||
      'https://rpc.testnet.soniclabs.com' // Default Sonic testnet RPC
    );
  }

  get privateKey(): string {
    const key = this.configService.get<string>('BLOCKCHAIN_PRIVATE_KEY');
    if (!key) {
      throw new Error('BLOCKCHAIN_PRIVATE_KEY is required for blockchain operations');
    }
    return key;
  }

  get network(): 'mainnet' | 'testnet' {
    return (this.configService.get<string>('BLOCKCHAIN_NETWORK') || 'testnet') as 'mainnet' | 'testnet';
  }

  get chainId(): number {
    if (this.network === 'mainnet') {
      return 146; // Sonic mainnet chain ID
    }
    return 64165; // Sonic testnet chain ID
  }

  get explorerUrl(): string {
    if (this.network === 'mainnet') {
      return 'https://sonicscan.org';
    }
    return 'https://testnet.sonicscan.org';
  }
}

