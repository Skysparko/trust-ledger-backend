import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { User, UserType } from '../entities/user.entity';
import { UserProfile, KYCStatus } from '../entities/user-profile.entity';
import { Investment, InvestmentStatus } from '../entities/investment.entity';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { PaymentMethod } from '../entities/investment.entity';
import { Issuance, IssuanceStatus } from '../entities/issuance.entity';
import { InvestmentOpportunity } from '../entities/investment-opportunity.entity';
import { Project, ProjectStatus } from '../entities/project.entity';
import { Document, DocumentCategory, DocumentType } from '../entities/document.entity';
import { Webinar } from '../entities/webinar.entity';
import { Post, PostCategory } from '../entities/post.entity';
import { CreateIssuanceDto } from '../dto/admin/create-issuance.dto';
import { CreateProjectDto } from '../dto/admin/create-project.dto';
import { CreateWebinarDto } from '../dto/admin/create-webinar.dto';
import { CreatePostDto } from '../dto/admin/create-post.dto';
import { FileUploadService } from '../common/file-upload.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
    @InjectRepository(Investment)
    private investmentRepository: Repository<Investment>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Issuance)
    private issuanceRepository: Repository<Issuance>,
    @InjectRepository(InvestmentOpportunity)
    private investmentOpportunityRepository: Repository<InvestmentOpportunity>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Webinar)
    private webinarRepository: Repository<Webinar>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    private fileUploadService: FileUploadService,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async getStats() {
    // Use MongoDB manager for MongoDB-compatible queries
    const mongoManager = this.dataSource.mongoManager;

    // Get all data - fetch all records and filter in JavaScript for MongoDB compatibility
    const [allUsers, allInvestments, allTransactions, allIssuances] = await Promise.all([
      mongoManager.getMongoRepository(User).find({}),
      mongoManager.getMongoRepository(Investment).find({}),
      mongoManager.getMongoRepository(Transaction).find({}),
      mongoManager.getMongoRepository(Issuance).find({}),
    ]);

    // Filter transactions for completed investment transactions
    const completedInvestmentTransactions = allTransactions.filter(
      (transaction) =>
        transaction.type === TransactionType.INVESTMENT &&
        transaction.status === TransactionStatus.COMPLETED,
    );

    // Filter issuances for active ones
    const activeIssuancesList = allIssuances.filter(
      (issuance) => issuance.status === IssuanceStatus.OPEN,
    );

    const totalUsers = allUsers.length;
    const totalInvestments = allInvestments.length;
    const activeIssuances = activeIssuancesList.length;

    const amountRaised = completedInvestmentTransactions.reduce((sum, transaction) => {
      return sum + Math.abs(Number(transaction.amount));
    }, 0);

    return {
      totalUsers,
      totalInvestments,
      amountRaised,
      activeIssuances,
    };
  }

  async getUsers(filters: {
    search?: string;
    kycStatus?: KYCStatus;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Fetch all users and profiles without Query Builder
    const [allUsers, allProfiles] = await Promise.all([
      this.userRepository.find(),
      this.profileRepository.find(),
    ]);

    // Build profile map
    const profileMap = new Map(allProfiles.map((p) => [p.userId, p]));

    // Filter users in JavaScript
    let filteredUsers = allUsers.filter((user) => {
      // Filter by isActive
      if (filters.isActive !== undefined && user.isActive !== filters.isActive) {
        return false;
      }

      // Filter by search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const nameMatch = user.name?.toLowerCase().includes(searchLower);
        const emailMatch = user.email?.toLowerCase().includes(searchLower);
        if (!nameMatch && !emailMatch) {
          return false;
        }
      }

      // Filter by KYC status
      if (filters.kycStatus) {
        const profile = profileMap.get(user.id);
        // Users without profiles default to PENDING status (as shown in the response mapping)
        const userKycStatus = profile?.kycStatus || KYCStatus.PENDING;
        if (userKycStatus !== filters.kycStatus) {
          return false;
        }
      }

      return true;
    });

    // Sort by createdAt descending
    filteredUsers.sort((a, b) => {
      const aDate = a.createdAt?.getTime() || 0;
      const bDate = b.createdAt?.getTime() || 0;
      return bDate - aDate;
    });

    // Apply pagination
    const total = filteredUsers.length;
    const paginatedUsers = filteredUsers.slice(skip, skip + limit);

    return {
      users: paginatedUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
        kycStatus: profileMap.get(user.id)?.kycStatus || KYCStatus.PENDING,
        isActive: user.isActive,
        createdAt: user.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async updateUserKYCStatus(userId: string, status: KYCStatus) {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    // Use update method for MongoDB compatibility (avoids relation loading issues)
    await this.profileRepository.update(
      { id: profile.id },
      { kycStatus: status },
    );

    // Fetch and return updated profile
    return await this.profileRepository.findOne({
      where: { id: profile.id },
    });
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Use update method for MongoDB compatibility (avoids relation loading issues)
    await this.userRepository.update(
      { id: userId },
      { isActive },
    );

    // Fetch and return updated user
    return await this.userRepository.findOne({
      where: { id: userId },
    });
  }

  async getTransactions(filters: {
    search?: string;
    status?: TransactionStatus;
    paymentMethod?: PaymentMethod;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Fetch all transactions, users, investments, and issuances
    const [allTransactions, allUsers, allInvestments, allIssuances, allInvestmentOpportunities] = await Promise.all([
      this.transactionRepository.find(),
      this.userRepository.find(),
      this.investmentRepository.find(),
      this.issuanceRepository.find(),
      this.investmentOpportunityRepository.find(),
    ]);

    // Build maps for joins
    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const investmentMap = new Map(allInvestments.map((i) => [i.id, i]));
    const issuanceMap = new Map(allIssuances.map((i) => [i.id, i]));
    const investmentOpportunityMap = new Map(allInvestmentOpportunities.map((io) => [io.id, io]));

    // Enrich transactions with related data and filter
    let enrichedTransactions = allTransactions.map((t) => {
      const user = t.userId ? userMap.get(t.userId) : null;
      const investment = t.investmentId ? investmentMap.get(t.investmentId) : null;
      // Keep issuance for backward compatibility with legacy data
      const issuance = null; // Legacy investments might have issuanceId, but new ones use investmentOpportunityId
      const investmentOpportunity = investment?.investmentOpportunityId ? investmentOpportunityMap.get(investment.investmentOpportunityId) : null;

      return {
        transaction: t,
        user,
        investment,
        issuance,
        investmentOpportunity,
      };
    });

    // Apply status filter if provided
    if (filters.status) {
      enrichedTransactions = enrichedTransactions.filter(
        (item) => item.transaction.status === filters.status,
      );
    }

    // Apply paymentMethod filter if provided
    if (filters.paymentMethod) {
      enrichedTransactions = enrichedTransactions.filter(
        (item) => item.transaction.paymentMethod === filters.paymentMethod,
      );
    }

    // Apply search filter if provided
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      enrichedTransactions = enrichedTransactions.filter((item) => {
        const nameMatch = item.user?.name?.toLowerCase().includes(searchLower);
        const emailMatch = item.user?.email?.toLowerCase().includes(searchLower);
        const titleMatch = item.investmentOpportunity?.title?.toLowerCase().includes(searchLower);
        return nameMatch || emailMatch || titleMatch;
      });
    }

    // Sort by date descending
    enrichedTransactions.sort((a, b) => {
      const aDate = a.transaction.date?.getTime() || 0;
      const bDate = b.transaction.date?.getTime() || 0;
      return bDate - aDate;
    });

    // Apply pagination
    const total = enrichedTransactions.length;
    const paginated = enrichedTransactions.slice(skip, skip + limit);

    return {
      transactions: paginated.map((item) => ({
        id: item.transaction.id,
        user: item.user ? { name: item.user.name, email: item.user.email } : null,
        issuance: null, // Legacy field for backward compatibility (no longer used)
        investmentOpportunity: item.investmentOpportunity ? { title: item.investmentOpportunity.title } : null,
        amount: item.transaction.amount,
        status: item.transaction.status,
        paymentMethod: item.transaction.paymentMethod,
        date: item.transaction.date,
        bonds: item.investment?.bonds || null,
      })),
      total,
      page,
      limit,
    };
  }

  async getIssuances(filters: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Fetch all issuances
    const allIssuances = await this.issuanceRepository.find();

    // Filter by search if provided
    let filteredIssuances = allIssuances;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredIssuances = allIssuances.filter(
        (issuance) =>
          issuance.title?.toLowerCase().includes(searchLower) ||
          issuance.location?.toLowerCase().includes(searchLower) ||
          issuance.company?.toLowerCase().includes(searchLower),
      );
    }

    // Sort by createdAt descending
    filteredIssuances.sort((a, b) => {
      const aDate = a.createdAt?.getTime() || 0;
      const bDate = b.createdAt?.getTime() || 0;
      return bDate - aDate;
    });

    // Apply pagination
    const total = filteredIssuances.length;
    const paginated = filteredIssuances.slice(skip, skip + limit);

    return {
      issuances: paginated,
      total,
      page,
      limit,
    };
  }

  async createIssuance(createIssuanceDto: CreateIssuanceDto) {
    // Generate ID manually for MongoDB compatibility
    const issuanceId = randomUUID();
    const now = new Date();
    
    // Use MongoDB manager's native insertOne to avoid relation metadata issues
    const mongoManager = this.dataSource.mongoManager;
    const issuanceData = {
      _id: issuanceId,
      id: issuanceId,
      ...createIssuanceDto,
      startDate: new Date(createIssuanceDto.startDate),
      endDate: createIssuanceDto.endDate
        ? new Date(createIssuanceDto.endDate)
        : undefined,
      currentFunding: 0,
      investorsCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    await mongoManager.getMongoRepository(Issuance).insertOne(issuanceData);
    
    // Fetch and return the created issuance
    return await this.issuanceRepository.findOne({
      where: { id: issuanceId },
    });
  }

  async updateIssuance(id: string, updateData: Partial<CreateIssuanceDto>) {
    const issuance = await this.issuanceRepository.findOne({
      where: { id },
    });

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    // Prepare update data for MongoDB compatibility
    const updatePayload: any = { ...updateData };
    
    if (updateData.startDate) {
      updatePayload.startDate = new Date(updateData.startDate);
    }

    if (updateData.endDate !== undefined) {
      updatePayload.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
    }

    // Add updatedAt timestamp
    updatePayload.updatedAt = new Date();

    // Use MongoDB manager's native updateOne to properly update existing document
    const mongoManager = this.dataSource.mongoManager;
    await mongoManager.getMongoRepository(Issuance).updateOne(
      { id },
      {
        $set: updatePayload,
      },
    );

    // Fetch and return updated issuance
    return await this.issuanceRepository.findOne({
      where: { id },
    });
  }

  async deleteIssuance(id: string) {
    const issuance = await this.issuanceRepository.findOne({
      where: { id },
    });

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    // Use delete method for MongoDB compatibility (avoids relation loading issues)
    await this.issuanceRepository.delete({ id });
    return { success: true };
  }

  async getProjects(filters: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Fetch all projects
    const allProjects = await this.projectRepository.find();

    // Filter by search if provided
    let filteredProjects = allProjects;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredProjects = allProjects.filter(
        (project) =>
          project.title?.toLowerCase().includes(searchLower) ||
          project.location?.toLowerCase().includes(searchLower),
      );
    }

    // Sort by createdAt descending
    filteredProjects.sort((a, b) => {
      const getDateValue = (date: Date | string | null | undefined): number => {
        if (!date) return 0;
        if (date instanceof Date) return date.getTime();
        if (typeof date === 'string') {
          const parsed = new Date(date);
          return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
        }
        return 0;
      };
      const aDate = getDateValue(a.createdAt);
      const bDate = getDateValue(b.createdAt);
      return bDate - aDate;
    });

    // Apply pagination
    const total = filteredProjects.length;
    const paginated = filteredProjects.slice(skip, skip + limit);

    return {
      projects: paginated,
      total,
      page,
      limit,
    };
  }

  async createProject(createProjectDto: CreateProjectDto) {
    // Generate ID manually for MongoDB compatibility
    const projectId = randomUUID();
    const now = new Date();
    
    // Map 'name' to 'title' if title is not provided
    const title = createProjectDto.title || createProjectDto.name;
    if (!title) {
      throw new BadRequestException('Either title or name must be provided');
    }
    
    // Use MongoDB manager's native insertOne to avoid relation metadata issues
    const mongoManager = this.dataSource.mongoManager;
    const { name, ...restDto } = createProjectDto; // Remove 'name' from DTO
    const projectData = {
      _id: projectId,
      id: projectId,
      ...restDto,
      title, // Use mapped title
      status: createProjectDto.status || 'Active',
      createdAt: now,
      updatedAt: now,
    };
    
    await mongoManager.getMongoRepository(Project).insertOne(projectData);
    
    // Fetch and return the created project
    return await this.projectRepository.findOne({
      where: { id: projectId },
    });
  }

  async updateProject(id: string, updateData: Partial<CreateProjectDto>) {
    const project = await this.projectRepository.findOne({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Use update method for MongoDB compatibility (avoids relation loading issues)
    await this.projectRepository.update(
      { id },
      updateData,
    );

    // Fetch and return updated project
    return await this.projectRepository.findOne({
      where: { id },
    });
  }

  async deleteProject(id: string) {
    const project = await this.projectRepository.findOne({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Use delete method for MongoDB compatibility (avoids relation loading issues)
    await this.projectRepository.delete({ id });
    return { success: true };
  }

  async getDocuments(filters: {
    search?: string;
    category?: DocumentCategory;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Fetch all documents
    const allDocuments = await this.documentRepository.find();

    // Filter by category if provided
    let filteredDocuments = allDocuments;
    if (filters.category) {
      filteredDocuments = filteredDocuments.filter(
        (document) => document.category === filters.category,
      );
    }

    // Filter by search if provided
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredDocuments = filteredDocuments.filter((document) =>
        document.name?.toLowerCase().includes(searchLower),
      );
    }

    // Sort by uploadedAt descending
    filteredDocuments.sort((a, b) => {
      const aDate = a.uploadedAt?.getTime() || 0;
      const bDate = b.uploadedAt?.getTime() || 0;
      return bDate - aDate;
    });

    // Apply pagination
    const total = filteredDocuments.length;
    const paginated = filteredDocuments.slice(skip, skip + limit);

    return {
      documents: paginated,
      total,
      page,
      limit,
    };
  }

  async uploadDocument(
    adminId: string,
    file: Express.Multer.File,
    category: DocumentCategory,
  ) {
    // Validate file
    this.fileUploadService.validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
    });

    // Save file
    const { url } = await this.fileUploadService.saveFile(file, 'documents');

    // Generate ID manually for MongoDB compatibility
    const documentId = randomUUID();
    const now = new Date();
    
    // Use MongoDB manager's native insertOne to avoid relation metadata issues
    const mongoManager = this.dataSource.mongoManager;
    const documentData = {
      _id: documentId,
      id: documentId,
      name: file.originalname,
      type: this.getDocumentType(file.originalname),
      size: file.size,
      uploadedAt: now,
      uploadedBy: adminId,
      category,
      url,
      createdAt: now,
    };
    
    await mongoManager.getMongoRepository(Document).insertOne(documentData);
    
    // Fetch and return the created document
    return await this.documentRepository.findOne({
      where: { id: documentId },
    });
  }

  private getDocumentType(filename: string): DocumentType {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return DocumentType.PDF;
    if (ext === 'doc' || ext === 'docx') return DocumentType.DOC;
    if (ext === 'xls' || ext === 'xlsx') return DocumentType.XLS;
    return DocumentType.OTHER;
  }

  async deleteDocument(id: string) {
    const document = await this.documentRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Use delete method for MongoDB compatibility (avoids relation loading issues)
    await this.documentRepository.delete({ id });
    return { success: true };
  }

  async getWebinars(filters: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Fetch all webinars
    const allWebinars = await this.webinarRepository.find();

    // Filter by search if provided
    let filteredWebinars = allWebinars;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredWebinars = allWebinars.filter(
        (webinar) =>
          webinar.title?.toLowerCase().includes(searchLower) ||
          webinar.speaker?.toLowerCase().includes(searchLower),
      );
    }

    // Sort by date descending
    filteredWebinars.sort((a, b) => {
      const aDate = a.date?.getTime() || 0;
      const bDate = b.date?.getTime() || 0;
      return bDate - aDate;
    });

    // Apply pagination
    const total = filteredWebinars.length;
    const paginated = filteredWebinars.slice(skip, skip + limit);

    return {
      webinars: paginated,
      total,
      page,
      limit,
    };
  }

  async createWebinar(createWebinarDto: CreateWebinarDto) {
    // Generate ID manually for MongoDB compatibility
    const webinarId = randomUUID();
    const now = new Date();
    
    // Use MongoDB manager's native insertOne to avoid relation metadata issues
    const mongoManager = this.dataSource.mongoManager;
    const webinarData = {
      _id: webinarId,
      id: webinarId,
      ...createWebinarDto,
      date: new Date(createWebinarDto.date),
      createdAt: now,
      updatedAt: now,
    };
    
    await mongoManager.getMongoRepository(Webinar).insertOne(webinarData);
    
    // Fetch and return the created webinar
    return await this.webinarRepository.findOne({
      where: { id: webinarId },
    });
  }

  async updateWebinar(id: string, updateData: Partial<CreateWebinarDto>) {
    const webinar = await this.webinarRepository.findOne({
      where: { id },
    });

    if (!webinar) {
      throw new NotFoundException('Webinar not found');
    }

    // Prepare update data for MongoDB compatibility
    const updatePayload: any = { ...updateData };
    
    if (updateData.date) {
      updatePayload.date = new Date(updateData.date);
    }

    // Use update method for MongoDB compatibility (avoids relation loading issues)
    await this.webinarRepository.update(
      { id },
      updatePayload,
    );

    // Fetch and return updated webinar
    return await this.webinarRepository.findOne({
      where: { id },
    });
  }

  async deleteWebinar(id: string) {
    const webinar = await this.webinarRepository.findOne({
      where: { id },
    });

    if (!webinar) {
      throw new NotFoundException('Webinar not found');
    }

    // Use delete method for MongoDB compatibility (avoids relation loading issues)
    await this.webinarRepository.delete({ id });
    return { success: true };
  }

  async getPosts(filters: {
    search?: string;
    category?: PostCategory;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Fetch all posts
    const allPosts = await this.postRepository.find();

    // Filter by category if provided
    let filteredPosts = allPosts;
    if (filters.category) {
      filteredPosts = filteredPosts.filter((post) => post.category === filters.category);
    }

    // Filter by search if provided
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredPosts = filteredPosts.filter((post) =>
        post.title?.toLowerCase().includes(searchLower),
      );
    }

    // Sort by date descending
    filteredPosts.sort((a, b) => {
      const aDate = a.date?.getTime() || 0;
      const bDate = b.date?.getTime() || 0;
      return bDate - aDate;
    });

    // Apply pagination
    const total = filteredPosts.length;
    const paginated = filteredPosts.slice(skip, skip + limit);

    return {
      posts: paginated,
      total,
      page,
      limit,
    };
  }

  async createPost(createPostDto: CreatePostDto) {
    // Generate ID manually for MongoDB compatibility
    const postId = randomUUID();
    const now = new Date();
    
    // Extract isPublished if present (not stored in entity)
    const { isPublished, ...postFields } = createPostDto;
    
    // Use MongoDB manager's native insertOne to avoid relation metadata issues
    const mongoManager = this.dataSource.mongoManager;
    const postData = {
      _id: postId,
      id: postId,
      ...postFields,
      date: new Date(createPostDto.date),
      createdAt: now,
      updatedAt: now,
    };
    
    await mongoManager.getMongoRepository(Post).insertOne(postData);
    
    // Fetch and return the created post
    return await this.postRepository.findOne({
      where: { id: postId },
    });
  }

  async updatePost(id: string, updateData: Partial<CreatePostDto>) {
    const post = await this.postRepository.findOne({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Prepare update data for MongoDB compatibility
    const updatePayload: any = { ...updateData };
    
    if (updateData.date) {
      updatePayload.date = new Date(updateData.date);
    }

    // Use update method for MongoDB compatibility (avoids relation loading issues)
    await this.postRepository.update(
      { id },
      updatePayload,
    );

    // Fetch and return updated post
    return await this.postRepository.findOne({
      where: { id },
    });
  }

  async deletePost(id: string) {
    const post = await this.postRepository.findOne({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Use delete method for MongoDB compatibility (avoids relation loading issues)
    await this.postRepository.delete({ id });
    return { success: true };
  }
}

