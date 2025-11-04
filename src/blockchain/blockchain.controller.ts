import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { BlockchainService } from './blockchain.service';
import { UserAuthGuard } from '../auth/user-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvestmentOpportunity } from '../entities/investment-opportunity.entity';
import { Investment } from '../entities/investment.entity';

class DeployBondTokenDto {
  opportunityId: string;
  name: string;
  symbol: string;
  maturityDate: number;
  couponRate: number;
  bondPrice: number;
}

class MintBondsDto {
  opportunityId: string;
  toAddress: string;
  amount: number;
}

class TransferBondsDto {
  opportunityId: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
}

@Controller('api/blockchain')
export class BlockchainController {
  constructor(
    private readonly blockchainService: BlockchainService,
    @InjectRepository(InvestmentOpportunity)
    private opportunityRepository: Repository<InvestmentOpportunity>,
    @InjectRepository(Investment)
    private investmentRepository: Repository<Investment>,
  ) {}

  @Post('deploy-bond-token')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async deployBondToken(@Body() dto: DeployBondTokenDto) {
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

    // Update opportunity with contract address
    opportunity.contractAddress = result.contractAddress;
    opportunity.contractDeploymentTx = result.transactionHash;
    await this.opportunityRepository.save(opportunity);

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
}

