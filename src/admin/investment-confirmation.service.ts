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
import { UserProfile } from '../entities/user-profile.entity';
import { EmailService } from '../common/email.service';
import { BlockchainService } from '../blockchain/blockchain.service';

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
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    private emailService: EmailService,
    private blockchainService: BlockchainService,
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

    // Log opportunity details for debugging
    this.logger.log(`Investment opportunity ${investmentOpportunity.id}: ${investmentOpportunity.title}`);
    this.logger.log(`Contract address: ${investmentOpportunity.contractAddress || 'NOT DEPLOYED'}`);

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

    // ========== MINT BONDS ON BLOCKCHAIN ==========
    // Following Energyblocks flow: Bonds are minted ONLY when admin confirms investment
    // - User creates investment → Status: PENDING, no minting (wallet address saved)
    // - Admin confirms investment → Status: CONFIRMED, THEN mint bonds on blockchain
    let mintTxHash: string | null = null;
    let walletAddress: string | null = null;
    
    this.logger.log(`[BLOCKCHAIN MINT] Starting blockchain minting process for investment ${investment.id}`);
    
    try {
      // Get wallet address from investment (saved during creation) or user profile
      const userProfile = await this.userProfileRepository.findOne({
        where: { userId: investment.userId },
      });

      // Priority: investment.walletAddress (from creation) > userProfile.walletAddress
      walletAddress = investment.walletAddress || userProfile?.walletAddress || null;
      
      this.logger.log(`[BLOCKCHAIN MINT] User ${investment.userId} wallet address: ${walletAddress || 'NOT FOUND'}`);
      this.logger.log(`[BLOCKCHAIN MINT] Contract address: ${investmentOpportunity.contractAddress || 'NOT DEPLOYED'}`);
      this.logger.log(`[BLOCKCHAIN MINT] Investment amount: ${investment.amount}, Bonds: ${investment.bonds || 'not set'}`);

      // Check if contract is deployed for this opportunity
      if (investmentOpportunity.contractAddress && walletAddress) {
        this.logger.log(`[BLOCKCHAIN MINT] ✅ All conditions met - proceeding with minting`);
        this.logger.log(`[BLOCKCHAIN MINT] Using contract address from opportunity: ${investmentOpportunity.contractAddress}`);
        this.logger.log(`[BLOCKCHAIN MINT] Minting to user wallet: ${walletAddress}`);
        
        const bondsToMint = investment.bonds || Math.floor(investment.amount / 100); // Default: 1 bond per €100
        
        if (bondsToMint > 0) {
          this.logger.log(
            `[BLOCKCHAIN MINT] Minting ${bondsToMint} bonds on blockchain for investment ${investment.id}`
          );
          this.logger.log(
            `[BLOCKCHAIN MINT] Contract: ${investmentOpportunity.contractAddress}, Recipient: ${walletAddress}`
          );

          // Mint bonds on the blockchain
          // IMPORTANT: Using investmentOpportunity.contractAddress (NOT admin wallet)
          // Bonds are minted to walletAddress (user's wallet, NOT admin wallet)
          const mintResult = await this.blockchainService.mintBonds(
            investmentOpportunity.contractAddress, // ✅ Contract address from opportunity
            walletAddress, // ✅ User's wallet address (recipient)
            bondsToMint,
          );

          mintTxHash = mintResult.transactionHash;
          
          this.logger.log(
            `[BLOCKCHAIN MINT] ✅ Successfully minted ${bondsToMint} bonds. Transaction hash: ${mintTxHash}`
          );

          // Update investment with mint transaction hash and wallet address
          await mongoManager.getMongoRepository(Investment).updateOne(
            { id: investment.id },
            {
              $set: {
                mintTxHash: mintTxHash,
                walletAddress: walletAddress,
                updatedAt: now,
              },
            },
          );

          this.logger.log(
            `[BLOCKCHAIN MINT] Investment ${investment.id} updated with mint transaction hash: ${mintTxHash}`
          );
        } else {
          this.logger.warn(
            `[BLOCKCHAIN MINT] ❌ No bonds to mint for investment ${investment.id}. Bonds: ${bondsToMint}, Amount: ${investment.amount}`
          );
        }
      } else {
        if (!investmentOpportunity.contractAddress) {
          this.logger.warn(
            `[BLOCKCHAIN MINT] ❌ Cannot mint bonds for investment ${investment.id}: Contract not deployed for opportunity ${investmentOpportunity.id}`
          );
          this.logger.warn(
            `[BLOCKCHAIN MINT] Action required: Admin must deploy the bond contract first using POST /api/blockchain/deploy-bond-token`
          );
        }
        if (!walletAddress) {
          this.logger.warn(
            `[BLOCKCHAIN MINT] ❌ Cannot mint bonds for investment ${investment.id}: User ${investment.userId} has no wallet address`
          );
          this.logger.warn(
            `[BLOCKCHAIN MINT] Action required: User must connect their wallet in their profile settings`
          );
        }
      }
    } catch (blockchainError: any) {
      // Log blockchain error but don't fail the investment confirmation
      // The investment is already confirmed, so we'll just log the error
      this.logger.error(
        `[BLOCKCHAIN MINT] ❌ FAILED to mint bonds on blockchain for investment ${investment.id}`,
      );
      this.logger.error(`[BLOCKCHAIN MINT] Error message: ${blockchainError.message || blockchainError}`);
      this.logger.error(`[BLOCKCHAIN MINT] Stack trace:`, blockchainError.stack);
      
      // Continue with investment confirmation even if blockchain minting fails
      // Admin can manually mint later if needed
    }
    
    this.logger.log(`[BLOCKCHAIN MINT] Final result - mintTxHash: ${mintTxHash || 'NONE'}, walletAddress: ${walletAddress || 'NONE'}`);

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
              // Include blockchain information if minting was successful
              mintTxHash: mintTxHash || null,
              contractAddress: investmentOpportunity.contractAddress || null,
              walletAddress: walletAddress || null,
              explorerUrl: mintTxHash 
                ? this.blockchainService.getExplorerUrl(mintTxHash)
                : null,
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

