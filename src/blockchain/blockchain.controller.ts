import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  Logger,
  UsePipes,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { BlockchainService } from './blockchain.service';
import { UserAuthGuard } from '../auth/user-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvestmentOpportunity } from '../entities/investment-opportunity.entity';
import { Investment } from '../entities/investment.entity';
import { DeployBondTokenDto } from '../dto/blockchain/deploy-bond-token.dto';
import { MintBondsDto } from '../dto/blockchain/mint-bonds.dto';
import { TransferBondsDto } from '../dto/blockchain/transfer-bonds.dto';
import { NoValidationPipe } from './no-validation.pipe';

@Controller('api/blockchain')
export class BlockchainController {
  private readonly logger = new Logger(BlockchainController.name);

  constructor(
    private readonly blockchainService: BlockchainService,
    @InjectRepository(InvestmentOpportunity)
    private opportunityRepository: Repository<InvestmentOpportunity>,
    @InjectRepository(Investment)
    private investmentRepository: Repository<Investment>,
  ) {}

  @Post('deploy-bond-token')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @UsePipes(NoValidationPipe)
  async deployBondToken(@Body() body: any) {
    this.logger.log('deployBondToken', body);
    // Manual validation to avoid class-validator metadata issues
    const dto: DeployBondTokenDto = {
      opportunityId: body.opportunityId,
      name: body.name,
      symbol: body.symbol,
      maturityDate: body.maturityDate ? Number(body.maturityDate) : undefined,
      couponRate: body.couponRate ? Number(body.couponRate) : undefined,
      bondPrice: body.bondPrice ? Number(body.bondPrice) : undefined,
    };

    // Basic validation
    if (!dto.opportunityId || typeof dto.opportunityId !== 'string') {
      throw new BadRequestException('opportunityId is required and must be a string');
    }
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: dto.opportunityId },
    });

    if (!opportunity) {
      throw new BadRequestException('Investment opportunity not found');
    }

    if (opportunity.contractAddress) {
      throw new BadRequestException('Bond contract already deployed for this opportunity');
    }

    // Calculate maturity date from termMonths
    const maturityDate = new Date(opportunity.startDate);
    maturityDate.setMonth(maturityDate.getMonth() + opportunity.termMonths);
    const maturityTimestamp = maturityDate.getTime();

    // Deploy contract
    const result = await this.blockchainService.deployBondToken(
      dto.opportunityId,
      dto.name || `${opportunity.company} Bond`,
      dto.symbol || `${opportunity.company.substring(0, 3).toUpperCase()}BOND`,
      maturityTimestamp,
      dto.couponRate || opportunity.rate * 100, // Convert to basis points
      dto.bondPrice || 100, // Default $100 per bond
    );

    // Validate contract address is not the wallet address
    const walletAddress = this.blockchainService.getWalletAddress();
    if (result.contractAddress.toLowerCase() === walletAddress.toLowerCase()) {
      throw new BadRequestException(
        `Invalid contract address: Contract address cannot be the same as wallet address. ` +
        `Contract: ${result.contractAddress}, Wallet: ${walletAddress}`
      );
    }

    // Verify contract exists at the address
    const contractExists = await this.blockchainService.contractExists(result.contractAddress);
    if (!contractExists) {
      throw new BadRequestException(
        `Contract does not exist at address ${result.contractAddress}. Deployment may have failed.`
      );
    }

    // Update opportunity with contract address
    // Use update() instead of save() to avoid TypeORM relation loading issues with MongoDB
    await this.opportunityRepository.update(
      { id: dto.opportunityId },
      {
        contractAddress: result.contractAddress,
        contractDeploymentTx: result.transactionHash,
      },
    );

    return {
      success: true,
      data: {
        contractAddress: result.contractAddress,
        transactionHash: result.transactionHash,
        explorerUrl: this.blockchainService.getContractExplorerUrl(result.contractAddress),
      },
    };
  }

  @Post('mint-bonds')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async mintBonds(@Body() dto: MintBondsDto, @Request() req) {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: dto.opportunityId },
    });

    if (!opportunity) {
      throw new BadRequestException('Investment opportunity not found');
    }

    if (!opportunity.contractAddress) {
      throw new BadRequestException('Bond contract not deployed for this opportunity');
    }

    // Mint bonds on-chain
    const result = await this.blockchainService.mintBonds(
      opportunity.contractAddress,
      dto.toAddress,
      dto.amount,
    );

    return {
      success: true,
      data: {
        transactionHash: result.transactionHash,
        explorerUrl: this.blockchainService.getExplorerUrl(result.transactionHash),
      },
    };
  }

  @Get('bond-balance/:opportunityId/:address')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async getBondBalance(
    @Param('opportunityId') opportunityId: string,
    @Param('address') address: string,
  ) {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityId },
    });

    if (!opportunity || !opportunity.contractAddress) {
      throw new BadRequestException('Bond contract not found');
    }

    const balance = await this.blockchainService.getBondBalance(
      opportunity.contractAddress,
      address,
    );

    const tokenBalance = await this.blockchainService.getTokenBalance(
      opportunity.contractAddress,
      address,
    );

    return {
      success: true,
      data: {
        bonds: balance,
        tokenBalance,
        contractAddress: opportunity.contractAddress,
      },
    };
  }

  @Post('transfer-bonds')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async transferBonds(@Body() dto: TransferBondsDto, @Request() req) {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: dto.opportunityId },
    });

    if (!opportunity || !opportunity.contractAddress) {
      throw new BadRequestException('Bond contract not found');
    }

    // Transfer bonds on-chain
    const result = await this.blockchainService.transferBonds(
      opportunity.contractAddress,
      dto.fromAddress,
      dto.toAddress,
      dto.amount,
    );

    return {
      success: true,
      data: {
        transactionHash: result.transactionHash,
        explorerUrl: this.blockchainService.getExplorerUrl(result.transactionHash),
      },
    };
  }

  @Get('contract-info/:opportunityId')
  @UseGuards(JwtAuthGuard)
  async getContractInfo(@Param('opportunityId') opportunityId: string) {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityId },
    });

    if (!opportunity || !opportunity.contractAddress) {
      throw new BadRequestException('Bond contract not found');
    }

    const info = await this.blockchainService.getContractInfo(opportunity.contractAddress);

    return {
      success: true,
      data: {
        ...info,
        explorerUrl: this.blockchainService.getContractExplorerUrl(opportunity.contractAddress),
      },
    };
  }

  @Get('user-holdings/:address')
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  async getUserHoldings(@Param('address') address: string) {
    // Get all opportunities with contracts
    const opportunities = await this.opportunityRepository.find({
      where: { contractAddress: { $ne: null } } as any,
    });

    const holdings: Array<{
      opportunityId: string;
      opportunityTitle: string;
      company: string;
      contractAddress: string;
      bonds: number;
    }> = [];

    for (const opp of opportunities) {
      if (opp.contractAddress) {
        try {
          const balance = await this.blockchainService.getBondBalance(
            opp.contractAddress,
            address,
          );

          if (balance > 0) {
            holdings.push({
              opportunityId: opp.id,
              opportunityTitle: opp.title,
              company: opp.company,
              contractAddress: opp.contractAddress,
              bonds: balance,
            });
          }
        } catch (error) {
          // Skip if contract call fails
          console.error(`Error fetching balance for ${opp.id}:`, error);
        }
      }
    }

    return {
      success: true,
      data: holdings,
    };
  }

  @Get('wallet-info')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async getWalletInfo() {
    const address = this.blockchainService.getWalletAddress();
    const balance = await this.blockchainService.getWalletBalance();

    return {
      success: true,
      data: {
        address,
        balance,
        network: process.env.BLOCKCHAIN_NETWORK || 'testnet',
        explorerUrl: this.blockchainService.getContractExplorerUrl(address),
      },
    };
  }

  @Get('contract-from-tx/:txHash')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async getContractAddressFromTx(@Param('txHash') txHash: string) {
    const contractAddress = await this.blockchainService.getContractAddressFromTx(txHash);
    
    if (!contractAddress) {
      throw new BadRequestException(
        `Could not find contract address from transaction ${txHash}. ` +
        `This might not be a contract deployment transaction, or the transaction hasn't been confirmed yet.`
      );
    }

    // Verify it's actually a contract
    const contractExists = await this.blockchainService.contractExists(contractAddress);
    
    return {
      success: true,
      data: {
        transactionHash: txHash,
        contractAddress,
        contractExists,
        explorerUrl: this.blockchainService.getContractExplorerUrl(contractAddress),
        transactionUrl: this.blockchainService.getExplorerUrl(txHash),
      },
    };
  }
}

