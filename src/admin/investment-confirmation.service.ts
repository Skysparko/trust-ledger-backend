import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Investment, InvestmentStatus } from '../entities/investment.entity';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { Issuance, IssuanceStatus } from '../entities/issuance.entity';
import { Asset, AssetType } from '../entities/asset.entity';
import { User } from '../entities/user.entity';
import { EmailService } from '../common/email.service';

@Injectable()
export class InvestmentConfirmationService {
  constructor(
    @InjectRepository(Investment)
    private investmentRepository: Repository<Investment>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Issuance)
    private issuanceRepository: Repository<Issuance>,
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async confirmInvestment(investmentId: string) {
    const investment = await this.investmentRepository.findOne({
      where: { id: investmentId },
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    if (investment.status !== InvestmentStatus.PENDING) {
      throw new BadRequestException('Investment is not in pending status');
    }

    // Fetch issuance separately since MongoDB relations might not load correctly
    const issuance = await this.issuanceRepository.findOne({
      where: { id: investment.issuanceId },
    });

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    if (issuance.status !== IssuanceStatus.OPEN) {
      throw new BadRequestException('Issuance is not open');
    }

    const mongoManager = this.dataSource.mongoManager;
    const now = new Date();

    // Update investment status using MongoDB manager
    await mongoManager.getMongoRepository(Investment).updateOne(
      { id: investmentId },
      {
        $set: {
          status: InvestmentStatus.CONFIRMED,
          updatedAt: now,
        },
      },
    );

    // Update transaction status
    const transaction = await this.transactionRepository.findOne({
      where: {
        userId: investment.userId,
        type: TransactionType.INVESTMENT,
        amount: -investment.amount,
      },
      order: { createdAt: 'DESC' },
    });

    if (transaction) {
      await mongoManager.getMongoRepository(Transaction).updateOne(
        { id: transaction.id },
        {
          $set: {
            status: TransactionStatus.COMPLETED,
            updatedAt: now,
          },
        },
      );
    }

    // Update issuance funding using MongoDB manager
    const newFunding = Number(issuance.currentFunding) + Number(investment.amount);
    const investorsCount = (issuance.investorsCount || 0) + 1;
    
    const updateData: any = {
      $set: {
        currentFunding: newFunding,
        investorsCount: investorsCount,
        updatedAt: now,
      },
    };

    // Check if funding target is reached
    if (newFunding >= Number(issuance.totalFundingTarget)) {
      updateData.$set.status = IssuanceStatus.CLOSED;
    }

    await mongoManager.getMongoRepository(Issuance).updateOne(
      { id: issuance.id },
      updateData,
    );

    // Create asset for user using MongoDB manager
    const assetId = randomUUID();
    const assetNow = new Date();
    
    const assetData = {
      _id: assetId,
      id: assetId,
      userId: investment.userId,
      issuanceId: issuance.id,
      name: `${issuance.title} - Bond #${investment.id.slice(0, 8)}`,
      type: AssetType.BOND,
      quantity: investment.bonds || investment.amount / 100,
      value: investment.amount,
      dateAcquired: assetNow,
      createdAt: assetNow,
    };
    
    await mongoManager.getMongoRepository(Asset).insertOne(assetData);

    // Send confirmation email to user
    const user = await this.userRepository.findOne({
      where: { id: investment.userId },
    });

    if (user) {
      await this.emailService.sendInvestmentConfirmation(
        user.email,
        user.name,
        {
          amount: Number(investment.amount),
          bonds: investment.bonds || Number(investment.amount) / 100,
          issuance: issuance.title,
        },
      );
    }

    // Fetch and return the updated investment
    return await this.investmentRepository.findOne({
      where: { id: investmentId },
    });
  }

  async cancelInvestment(investmentId: string) {
    const investment = await this.investmentRepository.findOne({
      where: { id: investmentId },
    });

    if (!investment) {
      throw new NotFoundException('Investment not found');
    }

    if (investment.status !== InvestmentStatus.PENDING) {
      throw new BadRequestException('Only pending investments can be cancelled');
    }

    const mongoManager = this.dataSource.mongoManager;
    const now = new Date();

    // Update investment status using MongoDB manager
    await mongoManager.getMongoRepository(Investment).updateOne(
      { id: investmentId },
      {
        $set: {
          status: InvestmentStatus.CANCELLED,
          updatedAt: now,
        },
      },
    );

    // Update transaction status
    const transaction = await this.transactionRepository.findOne({
      where: {
        userId: investment.userId,
        type: TransactionType.INVESTMENT,
        amount: -investment.amount,
      },
      order: { createdAt: 'DESC' },
    });

    if (transaction) {
      await mongoManager.getMongoRepository(Transaction).updateOne(
        { id: transaction.id },
        {
          $set: {
            status: TransactionStatus.FAILED,
            updatedAt: now,
          },
        },
      );
    }

    // Fetch and return the updated investment
    return await this.investmentRepository.findOne({
      where: { id: investmentId },
    });
  }
}

