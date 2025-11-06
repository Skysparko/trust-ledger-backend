import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from '../entities/user.entity';
import { UserProfile, KYCStatus, WalletNetwork } from '../entities/user-profile.entity';
import { Investment, InvestmentStatus } from '../entities/investment.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { Asset } from '../entities/asset.entity';
import { Notification } from '../entities/notification.entity';
import { InvestmentOpportunity, InvestmentOpportunityStatus } from '../entities/investment-opportunity.entity';
import { UpdateProfileDto } from '../dto/user/update-profile.dto';
import { CreateInvestmentDto } from '../dto/user/create-investment.dto';
import { PaymentMethod } from '../entities/investment.entity';
import { FileUploadService } from '../common/file-upload.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
    @InjectRepository(Investment)
    private investmentRepository: Repository<Investment>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(InvestmentOpportunity)
    private investmentOpportunityRepository: Repository<InvestmentOpportunity>,
    private fileUploadService: FileUploadService,
    private blockchainService: BlockchainService,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * Get or create a user profile. Auto-creates profile if it doesn't exist.
   */
  private async getOrCreateProfile(userId: string): Promise<UserProfile> {
    let profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      // Auto-create profile if it doesn't exist
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'name', 'email'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Use direct instantiation for MongoDB compatibility
      const newProfile = new UserProfile();
      newProfile.userId = user.id;
      newProfile.name = user.name;
      newProfile.email = user.email;

      await this.profileRepository.save(newProfile);

      // Fetch the saved profile from database to ensure proper metadata
      profile = await this.profileRepository.findOne({
        where: { userId },
      });

      if (!profile) {
        throw new NotFoundException('Failed to create profile');
      }
    }

    return profile;
  }

  async getProfile(userId: string) {
    return this.getOrCreateProfile(userId);
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const profile = await this.getOrCreateProfile(userId);
    
    // Filter out undefined values and use update method for MongoDB compatibility
    const updateData: Partial<UserProfile> = {};
    if (updateProfileDto.name !== undefined) updateData.name = updateProfileDto.name;
    if (updateProfileDto.email !== undefined) updateData.email = updateProfileDto.email;
    if (updateProfileDto.phone !== undefined) updateData.phone = updateProfileDto.phone;
    if (updateProfileDto.bank !== undefined) updateData.bank = updateProfileDto.bank as any;
    if (updateProfileDto.walletAddress !== undefined) updateData.walletAddress = updateProfileDto.walletAddress;
    if (updateProfileDto.walletNetwork !== undefined) updateData.walletNetwork = updateProfileDto.walletNetwork as WalletNetwork;
    
    await this.profileRepository.update({ id: profile.id }, updateData);
    
    // Fetch and return updated profile
    return await this.profileRepository.findOne({
      where: { id: profile.id },
    });
  }

  async uploadKYC(userId: string, file: Express.Multer.File) {
    const profile = await this.getOrCreateProfile(userId);

    // Validate file
    this.fileUploadService.validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    });

    // Save file
    const { url } = await this.fileUploadService.saveFile(file, 'kyc');

    // Use update method for MongoDB compatibility
    await this.profileRepository.update(
      { id: profile.id },
      {
        kycDocumentName: file.originalname,
        kycDocumentUrl: url,
        kycStatus: KYCStatus.PENDING,
      },
    );

    // Fetch and return updated profile
    return await this.profileRepository.findOne({
      where: { id: profile.id },
    });
  }

  async signAgreement(userId: string) {
    const profile = await this.getOrCreateProfile(userId);

    // Use update method for MongoDB compatibility
    await this.profileRepository.update(
      { id: profile.id },
      {
        agreementSigned: true,
        agreementSignedAt: new Date(),
      },
    );

    // Fetch and return updated profile
    return await this.profileRepository.findOne({
      where: { id: profile.id },
    });
  }

  async toggleTwoFactor(userId: string, enabled: boolean) {
    const profile = await this.getOrCreateProfile(userId);

    // Use update method for MongoDB compatibility
    await this.profileRepository.update(
      { id: profile.id },
      {
        twoFactorEnabled: enabled,
      },
    );

    // TODO: Generate recovery codes when enabling
    const recoveryCodes = enabled ? ['code1', 'code2', 'code3'] : undefined;

    return {
      enabled,
      recoveryCodes,
    };
  }

  async updateWallet(
    userId: string,
    walletAddress: string,
    walletNetwork: WalletNetwork,
  ) {
    const profile = await this.getOrCreateProfile(userId);

    // Use update method for MongoDB compatibility
    await this.profileRepository.update(
      { id: profile.id },
      {
        walletAddress,
        walletNetwork,
      },
    );

    // Fetch and return updated profile
    return await this.profileRepository.findOne({
      where: { id: profile.id },
    });
  }

  async createInvestment(userId: string, createInvestmentDto: CreateInvestmentDto) {
    const investmentOpportunity = await this.investmentOpportunityRepository.findOne({
      where: { id: createInvestmentDto.investmentOpportunityId },
    });

    if (!investmentOpportunity) {
      throw new NotFoundException('Investment opportunity not found');
    }

    if (investmentOpportunity.status !== InvestmentOpportunityStatus.ACTIVE) {
      throw new BadRequestException('Investment opportunity is not active for investment');
    }

    // Calculate amount: $100 per bond (default)
    const amount = createInvestmentDto.bonds * 100;

    if (amount < Number(investmentOpportunity.minInvestment)) {
      throw new BadRequestException(
        `Minimum investment is $${investmentOpportunity.minInvestment}`,
      );
    }

    if (investmentOpportunity.maxInvestment && amount > Number(investmentOpportunity.maxInvestment)) {
      throw new BadRequestException(
        `Maximum investment is $${investmentOpportunity.maxInvestment}`,
      );
    }

    const newFunding = Number(investmentOpportunity.currentFunding) + amount;
    if (newFunding > Number(investmentOpportunity.totalFundingTarget)) {
      throw new BadRequestException('Investment exceeds funding target');
    }

    // Generate IDs manually for MongoDB compatibility
    const investmentId = randomUUID();
    const transactionId = randomUUID();
    const now = new Date();
    
    // Use MongoDB manager's native insertOne to avoid relation metadata issues
    const mongoManager = this.dataSource.mongoManager;
    
    // Create investment using MongoDB manager
    const investmentData = {
      _id: investmentId,
      id: investmentId,
      userId,
      investmentOpportunityId: createInvestmentDto.investmentOpportunityId,
      date: now,
      amount,
      bonds: createInvestmentDto.bonds,
      paymentMethod: createInvestmentDto.paymentMethod,
      status: InvestmentStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };
    
    await mongoManager.getMongoRepository(Investment).insertOne(investmentData);

    // Create transaction using MongoDB manager
    const transactionData = {
      _id: transactionId,
      id: transactionId,
      userId,
      date: now,
      type: TransactionType.INVESTMENT,
      amount: -amount, // Negative for investment
      currency: 'USD',
      status: TransactionStatus.PENDING,
      reference: `TXN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`,
      investmentId: investmentId,
      createdAt: now,
      updatedAt: now,
    };
    
    await mongoManager.getMongoRepository(Transaction).insertOne(transactionData);

    // Save wallet address if provided (will be used for minting when admin confirms)
    // Following Energyblocks flow: bonds are minted ONLY when admin confirms, not on creation
    let walletAddress: string | null = null;
    if (createInvestmentDto.walletAddress) {
      walletAddress = createInvestmentDto.walletAddress;
      // Save wallet address to investment for later use during confirmation
      await mongoManager.getMongoRepository(Investment).updateOne(
        { id: investmentId },
        {
          $set: {
            walletAddress: walletAddress,
          },
        },
      );
      this.logger.log(`Wallet address saved for investment ${investmentId}: ${walletAddress}`);
    } else {
      // Try to get wallet address from user profile
      const profile = await this.getOrCreateProfile(userId);
      if (profile?.walletAddress) {
        walletAddress = profile.walletAddress;
        await mongoManager.getMongoRepository(Investment).updateOne(
          { id: investmentId },
          {
            $set: {
              walletAddress: walletAddress,
            },
          },
        );
        this.logger.log(`Wallet address from profile saved for investment ${investmentId}: ${walletAddress}`);
      }
    }

    // Note: Bonds will be minted when admin confirms the investment
    // Investment status remains PENDING until admin approval
    // Following Energyblocks flow: create → pending → admin confirms → mint bonds

    // Fetch and return the created investment
    return await this.investmentRepository.findOne({
      where: { id: investmentId },
    });
  }

  async getInvestments(userId: string) {
    const investments = await this.investmentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // Get unique investment opportunity IDs
    const opportunityIds = [...new Set(investments.map(inv => inv.investmentOpportunityId).filter(Boolean))];
    
    // Fetch all investment opportunities - fetch individually for MongoDB compatibility
    const opportunities = await Promise.all(
      opportunityIds.map(id =>
        this.investmentOpportunityRepository.findOne({ where: { id } })
      )
    ).then(results => results.filter(Boolean) as InvestmentOpportunity[]);
    
    // Create a map for quick lookup
    const opportunityMap = new Map(opportunities.map(opp => [opp.id, opp]));

    // Map investments to include investmentOpportunityTitle
    return investments.map((investment) => ({
      ...investment,
      investmentOpportunityTitle: opportunityMap.get(investment.investmentOpportunityId)?.title || null,
    }));
  }

  async getTransactions(userId: string, type?: string, status?: string) {
    // Build where clause for MongoDB
    const where: any = { userId };

    if (type && type !== 'all') {
      where.type = type;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const transactions = await this.transactionRepository.find({
      where,
      order: { date: 'DESC' },
    });

    // Return transactions with absolute amounts
    return transactions.map((transaction) => ({
      ...transaction,
      amount: Math.abs(transaction.amount),
    }));
  }

  async getAssets(userId: string) {
    return await this.assetRepository.find({
      where: { userId },
      relations: ['investmentOpportunity'],
      order: { dateAcquired: 'DESC' },
    });
  }

  async getNotifications(userId: string) {
    return await this.notificationRepository.find({
      where: { userId },
      order: { date: 'DESC' },
    });
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.read = true;
    return await this.notificationRepository.save(notification);
  }

  async markAllNotificationsRead(userId: string) {
    await this.notificationRepository.update(
      { userId, read: false },
      { read: true },
    );

    return { success: true };
  }
}

