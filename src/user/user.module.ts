import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { Investment } from '../entities/investment.entity';
import { Transaction } from '../entities/transaction.entity';
import { Asset } from '../entities/asset.entity';
import { Notification } from '../entities/notification.entity';
import { InvestmentOpportunity } from '../entities/investment-opportunity.entity';
import { FileUploadService } from '../common/file-upload.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      Investment,
      Transaction,
      Asset,
      Notification,
      InvestmentOpportunity,
    ]),
    BlockchainModule,
  ],
  controllers: [UserController],
  providers: [UserService, FileUploadService],
  exports: [UserService],
})
export class UserModule {}

