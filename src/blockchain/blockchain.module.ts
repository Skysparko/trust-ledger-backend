import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainService } from './blockchain.service';
import { BlockchainConfig } from './blockchain.config';
import { BlockchainController } from './blockchain.controller';
import { InvestmentOpportunity } from '../entities/investment-opportunity.entity';
import { Investment } from '../entities/investment.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([InvestmentOpportunity, Investment]),
  ],
  controllers: [BlockchainController],
  providers: [BlockchainService, BlockchainConfig],
  exports: [BlockchainService, BlockchainConfig],
})
export class BlockchainModule {}

