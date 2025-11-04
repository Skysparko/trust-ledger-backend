import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Investment, InvestmentStatus } from '../entities/investment.entity';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { InvestmentOpportunity, InvestmentOpportunityStatus } from '../entities/investment-opportunity.entity';
import { Asset, AssetType } from '../entities/asset.entity';
import { User } from '../entities/user.entity';
import { EmailService } from '../common/email.service';

@Injectable()
export class InvestmentConfirmationService {
  private readonly logger = new Logger(InvestmentConfirmationService.name);

  constructor(
    @InjectRepository(Investment)
    private investmentRepository: Repository<Investment>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(InvestmentOpportunity)
    private investmentOpportunityRepository: Repository<InvestmentOpportunity>,
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async confirmInvestment(id: string) {
    // Try to find investment by ID first
    let investment = await this.investmentRepository.findOne({
      where: { id },
    });

    // If not found as investment, try as transaction ID
    if (!investment) {
      const transaction = await this.transactionRepository.findOne({
        where: { id },
      });

      if (transaction && transaction.investmentId) {
        investment = await this.investmentRepository.findOne({
          where: { id: transaction.investmentId },
        });
      }

      if (!investment) {
        throw new NotFoundException(`No investment found with ID: ${id}`);
      }
    }

    if (investment.status !== InvestmentStatus.PENDING) {
      throw new BadRequestException('Investment is not in pending status');
    }

    // Fetch investment opportunity separately since MongoDB relations might not load correctly
    const investmentOpportunity = await this.investmentOpportunityRepository.findOne({
      where: { id: investment.investmentOpportunityId },
    });

    if (!investmentOpportunity) {
      throw new NotFoundException('Investment opportunity not found');
    }

    if (investmentOpportunity.status !== InvestmentOpportunityStatus.ACTIVE) {
      throw new BadRequestException('Investment opportunity is not active');
    }

    const mongoManager = this.dataSource.mongoManager;
    const now = new Date();

    // Update investment status using MongoDB manager
    await mongoManager.getMongoRepository(Investment).updateOne(
      { id: investment.id },
      {
        $set: {
          status: InvestmentStatus.CONFIRMED,
          updatedAt: now,
        },
      },
    );

    // Find and update transaction status
    let transaction: Transaction | null = null;
    if (investment.id) {
      // Try to find transaction by investmentId first
      transaction = await this.transactionRepository.findOne({
        where: {
          investmentId: investment.id,
        },
      });
    }
    
    // If not found, try to find by user and amount
    if (!transaction) {
      transaction = await this.transactionRepository.findOne({
        where: {
          userId: investment.userId,
          type: TransactionType.INVESTMENT,
          amount: -investment.amount,
        },
        order: { createdAt: 'DESC' },
      });
    }

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

    // Update investment opportunity funding using MongoDB manager
    const newFunding = Number(investmentOpportunity.currentFunding) + Number(investment.amount);
    const investorsCount = (investmentOpportunity.investorsCount || 0) + 1;
    
    const updateData: any = {
      $set: {
        currentFunding: newFunding,
        investorsCount: investorsCount,
        updatedAt: now,
      },
    };

    // Check if funding target is reached
    if (newFunding >= Number(investmentOpportunity.totalFundingTarget)) {
      updateData.$set.status = InvestmentOpportunityStatus.CLOSED;
    }

    // Update investment opportunity funding - try with id first, fallback to _id
    const updateResult = await mongoManager.getMongoRepository(InvestmentOpportunity).updateOne(
      { id: investmentOpportunity.id },
      updateData,
    );
    
    // If not found with id, try with _id
    if (updateResult.matchedCount === 0) {
      await mongoManager.getMongoRepository(InvestmentOpportunity).updateOne(
        { _id: investmentOpportunity.id },
        updateData,
      );
    }

    // Create asset for user using MongoDB manager
    const assetId = randomUUID();
    const assetNow = new Date();
    
    const assetData = {
      _id: assetId,
      id: assetId,
      userId: investment.userId,
      investmentOpportunityId: investmentOpportunity.id,
      name: `${investmentOpportunity.title} - Bond #${investment.id.slice(0, 8)}`,
      type: AssetType.BOND,
      quantity: investment.bonds || investment.amount / 100,
      value: investment.amount,
      dateAcquired: assetNow,
      createdAt: assetNow,
    };
    
    await mongoManager.getMongoRepository(Asset).insertOne(assetData);

    // Fetch the updated investment first (to ensure all operations succeeded)
    const updatedInvestment = await this.investmentRepository.findOne({
      where: { id: investment.id },
    });

    // Only send email after all operations succeed
    if (updatedInvestment) {
      try {
        const user = await this.userRepository.findOne({
          where: { id: investment.userId },
        });

        if (user) {
          await this.emailService.sendInvestmentConfirmation(
            user.email,
            user.name,
            {
              investmentId: investment.id,
              transactionId: transaction?.id,
              amount: Number(investment.amount),
              bonds: investment.bonds || Number(investment.amount) / 100,
              investmentOpportunity: investmentOpportunity.title,
              paymentMethod: investment.paymentMethod || transaction?.paymentMethod,
              date: investment.date?.toISOString() || investment.createdAt?.toISOString() || new Date().toISOString(),
              status: InvestmentStatus.CONFIRMED,
            },
          );
          this.logger.log(`Confirmation email sent successfully to ${user.email} for investment ${investment.id}`);
        }
      } catch (emailError) {
        // Log email error but don't fail the API response
        this.logger.error(
          `Failed to send confirmation email for investment ${investment.id}:`,
          emailError,
        );
      }
    }

    return updatedInvestment;
  }

  async cancelInvestment(id: string) {
    // Try to find investment by ID first
    let investment = await this.investmentRepository.findOne({
      where: { id },
    });

    // If not found as investment, try as transaction ID
    if (!investment) {
      const transaction = await this.transactionRepository.findOne({
        where: { id },
      });

      if (transaction && transaction.investmentId) {
        investment = await this.investmentRepository.findOne({
          where: { id: transaction.investmentId },
        });
      }

      if (!investment) {
        throw new NotFoundException(`No investment found with ID: ${id}`);
      }
    }

    if (investment.status !== InvestmentStatus.PENDING) {
      throw new BadRequestException('Only pending investments can be cancelled');
    }

    const mongoManager = this.dataSource.mongoManager;
    const now = new Date();

    // Update investment status using MongoDB manager
    await mongoManager.getMongoRepository(Investment).updateOne(
      { id: investment.id },
      {
        $set: {
          status: InvestmentStatus.CANCELLED,
          updatedAt: now,
        },
      },
    );

    // Find and update transaction status
    let transaction: Transaction | null = null;
    if (investment.id) {
      // Try to find transaction by investmentId first
      transaction = await this.transactionRepository.findOne({
        where: {
          investmentId: investment.id,
        },
      });
    }
    
    // If not found, try to find by user and amount
    if (!transaction) {
      transaction = await this.transactionRepository.findOne({
        where: {
          userId: investment.userId,
          type: TransactionType.INVESTMENT,
          amount: -investment.amount,
        },
        order: { createdAt: 'DESC' },
      });
    }

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

    // Fetch the updated investment first (to ensure all operations succeeded)
    const updatedInvestment = await this.investmentRepository.findOne({
      where: { id: investment.id },
    });

    // Only send email after all operations succeed
    if (updatedInvestment) {
      try {
        // Get investment opportunity for email
        const investmentOpportunity = investment.investmentOpportunityId
          ? await this.investmentOpportunityRepository.findOne({
              where: { id: investment.investmentOpportunityId },
            })
          : null;

        const user = await this.userRepository.findOne({
          where: { id: investment.userId },
        });

        if (user) {
          await this.emailService.sendInvestmentCancellation(
            user.email,
            user.name,
            {
              investmentId: investment.id,
              transactionId: transaction?.id,
              amount: Number(investment.amount),
              bonds: investment.bonds || Number(investment.amount) / 100,
              investmentOpportunity: investmentOpportunity?.title || 'Investment Opportunity',
              paymentMethod: investment.paymentMethod || transaction?.paymentMethod,
              date: investment.date?.toISOString() || investment.createdAt?.toISOString() || new Date().toISOString(),
              status: InvestmentStatus.CANCELLED,
            },
          );
          this.logger.log(`Cancellation email sent successfully to ${user.email} for investment ${investment.id}`);
        }
      } catch (emailError) {
        // Log email error but don't fail the API response
        this.logger.error(
          `Failed to send cancellation email for investment ${investment.id}:`,
          emailError,
        );
      }
    }

    return updatedInvestment;
  }
}

