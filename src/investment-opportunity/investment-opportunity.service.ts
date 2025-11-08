import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { InvestmentOpportunity, InvestmentOpportunityStatus } from '../entities/investment-opportunity.entity';
import {
  InvestmentOpportunityDocument,
  InvestmentOpportunityDocumentType,
} from '../entities/investment-opportunity-document.entity';
import { CreateInvestmentOpportunityDto } from '../dto/investment-opportunity/create-investment-opportunity.dto';
import { UpdateInvestmentOpportunityDto } from '../dto/investment-opportunity/update-investment-opportunity.dto';
import { QueryInvestmentOpportunityDto, SortBy, SortOrder } from '../dto/investment-opportunity/query-investment-opportunity.dto';
import { QueryDropdownDto } from '../dto/investment-opportunity/query-dropdown.dto';
import { FileUploadService } from '../common/file-upload.service';

interface CacheEntry {
  data: any;
  expiresAt: number;
}

@Injectable()
export class InvestmentOpportunityService {
  // Simple in-memory cache for dropdown endpoint
  private dropdownCache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 7 * 60 * 1000; // 7 minutes in milliseconds

  constructor(
    @InjectRepository(InvestmentOpportunity)
    private opportunityRepository: Repository<InvestmentOpportunity>,
    @InjectRepository(InvestmentOpportunityDocument)
    private documentRepository: Repository<InvestmentOpportunityDocument>,
    private fileUploadService: FileUploadService,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async findAll(query: QueryInvestmentOpportunityDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Fetch all opportunities
    const allOpportunities = await this.opportunityRepository.find();

    // Apply filters
    let filteredOpportunities = allOpportunities.filter((opp) => {
      // Status filter
      if (query.status && opp.status !== query.status) {
        return false;
      }

      // Sector filter
      if (query.sector && opp.sector?.toLowerCase() !== query.sector.toLowerCase()) {
        return false;
      }

      // Risk level filter
      if (query.riskLevel && opp.riskLevel !== query.riskLevel) {
        return false;
      }

      // Rate filters
      if (query.minRate !== undefined && Number(opp.rate) < query.minRate) {
        return false;
      }
      if (query.maxRate !== undefined && Number(opp.rate) > query.maxRate) {
        return false;
      }

      // Location filter
      if (query.location && opp.location?.toLowerCase() !== query.location.toLowerCase()) {
        return false;
      }

      // Type filter
      if (query.type && opp.type?.toLowerCase() !== query.type.toLowerCase()) {
        return false;
      }

      // Search filter
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        const matchesTitle = opp.title?.toLowerCase().includes(searchLower);
        const matchesDescription = opp.description?.toLowerCase().includes(searchLower);
        const matchesCompany = opp.company?.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesDescription && !matchesCompany) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    const sortBy = query.sortBy || SortBy.CREATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;

    filteredOpportunities.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case SortBy.CREATED_AT:
          aValue = a.createdAt?.getTime() || 0;
          bValue = b.createdAt?.getTime() || 0;
          break;
        case SortBy.START_DATE:
          aValue = a.startDate?.getTime() || 0;
          bValue = b.startDate?.getTime() || 0;
          break;
        case SortBy.RATE:
          aValue = Number(a.rate) || 0;
          bValue = Number(b.rate) || 0;
          break;
        case SortBy.CURRENT_FUNDING:
          aValue = Number(a.currentFunding) || 0;
          bValue = Number(b.currentFunding) || 0;
          break;
        case SortBy.POPULARITY:
          aValue = a.investorsCount || 0;
          bValue = b.investorsCount || 0;
          break;
        default:
          aValue = a.createdAt?.getTime() || 0;
          bValue = b.createdAt?.getTime() || 0;
      }

      if (sortOrder === SortOrder.ASC) {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    // Apply pagination
    const total = filteredOpportunities.length;
    const paginated = filteredOpportunities.slice(skip, skip + limit);

    // Map to list item format
    const opportunities = paginated.map((opp) => this.mapToListItem(opp));

    return {
      opportunities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id },
    });

    if (!opportunity) {
      throw new NotFoundException('Investment opportunity not found');
    }

    // Get documents for this opportunity
    const documents = await this.documentRepository.find({
      where: { opportunityId: id },
      order: { uploadedAt: 'DESC' },
    });

    return this.mapToDetail(opportunity, documents);
  }

  async create(
    createDto: CreateInvestmentOpportunityDto,
    adminId: string,
  ): Promise<InvestmentOpportunity> {
    // Validate dates
    const startDate = new Date(createDto.startDate);
    if (isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid start date');
    }

    if (createDto.endDate) {
      const endDate = new Date(createDto.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid end date');
      }
      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Validate maxInvestment > minInvestment if provided
    if (createDto.maxInvestment && createDto.maxInvestment <= createDto.minInvestment) {
      throw new BadRequestException('Max investment must be greater than min investment');
    }

    // Validate totalFundingTarget > minInvestment
    if (createDto.totalFundingTarget <= createDto.minInvestment) {
      throw new BadRequestException('Total funding target must be greater than min investment');
    }

    // Generate slug if not provided
    let slug = createDto.slug;
    if (!slug) {
      slug = this.generateSlug(createDto.title);
      // Check if slug exists
      const existing = await this.opportunityRepository.findOne({ where: { slug } });
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    // Generate ID manually for MongoDB compatibility
    const opportunityId = randomUUID();
    const now = new Date();

    // Prepare data
    const opportunityData: any = {
      _id: opportunityId,
      id: opportunityId,
      title: createDto.title,
      slug,
      company: createDto.company,
      sector: createDto.sector,
      type: createDto.type,
      location: createDto.location,
      description: createDto.description,
      shortDescription: createDto.shortDescription,
      rate: createDto.rate,
      minInvestment: createDto.minInvestment,
      maxInvestment: createDto.maxInvestment,
      termMonths: createDto.termMonths,
      totalFundingTarget: createDto.totalFundingTarget,
      currentFunding: 0,
      paymentFrequency: createDto.paymentFrequency,
      bondStructure: createDto.bondStructure,
      creditRating: createDto.creditRating,
      earlyRedemptionAllowed: createDto.earlyRedemptionAllowed || false,
      earlyRedemptionPenalty: createDto.earlyRedemptionPenalty,
      status: createDto.status || InvestmentOpportunityStatus.UPCOMING,
      startDate: startDate,
      endDate: createDto.endDate ? new Date(createDto.endDate) : undefined,
      riskLevel: createDto.riskLevel,
      companyDescription: createDto.companyDescription,
      companyWebsite: createDto.companyWebsite,
      companyAddress: createDto.companyAddress,
      projectType: createDto.projectType,
      useOfFunds: createDto.useOfFunds,
      keyHighlights: createDto.keyHighlights || [],
      riskFactors: createDto.riskFactors || [],
      legalStructure: createDto.legalStructure,
      jurisdiction: createDto.jurisdiction,
      thumbnailImage: createDto.thumbnailImage,
      logo: createDto.logo,
      images: createDto.images || [],
      videoUrl: createDto.videoUrl,
      isFeatured: createDto.isFeatured || false,
      investorsCount: 0,
      averageInvestment: null,
      medianInvestment: null,
      largestInvestment: null,
      faq: createDto.faq || [],
      milestones: createDto.milestones?.map((m) => ({
        date: m.date,
        description: m.description,
        status: 'pending' as const,
      })) || [],
      tags: createDto.tags || [],
      relatedOpportunities: createDto.relatedOpportunities || [],
      seoTitle: createDto.seoTitle,
      seoDescription: createDto.seoDescription,
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    };

    // Use MongoDB manager's native insertOne
    const mongoManager = this.dataSource.mongoManager;
    await mongoManager.getMongoRepository(InvestmentOpportunity).insertOne(opportunityData);

    // Fetch and return the created opportunity
    const created = await this.opportunityRepository.findOne({
      where: { id: opportunityId },
    });

    if (!created) {
      throw new BadRequestException('Failed to create investment opportunity');
    }

    // Clear dropdown cache since a new opportunity was created
    this.clearDropdownCache();

    return created;
  }

  async update(
    id: string,
    updateDto: UpdateInvestmentOpportunityDto,
  ): Promise<InvestmentOpportunity> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id },
    });

    if (!opportunity) {
      throw new NotFoundException('Investment opportunity not found');
    }

    // Validate dates if provided
    if (updateDto.startDate) {
      const startDate = new Date(updateDto.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException('Invalid start date');
      }
    }

    if (updateDto.endDate !== undefined) {
      if (updateDto.endDate) {
        const endDate = new Date(updateDto.endDate);
        if (isNaN(endDate.getTime())) {
          throw new BadRequestException('Invalid end date');
        }
        const startDate = updateDto.startDate ? new Date(updateDto.startDate) : opportunity.startDate;
        if (endDate <= startDate) {
          throw new BadRequestException('End date must be after start date');
        }
      }
    }

    // Validate maxInvestment > minInvestment if both provided
    const minInvestment = updateDto.minInvestment ?? opportunity.minInvestment;
    const maxInvestment = updateDto.maxInvestment ?? opportunity.maxInvestment;
    if (maxInvestment && minInvestment && maxInvestment <= minInvestment) {
      throw new BadRequestException('Max investment must be greater than min investment');
    }

    // Prepare update data
    const updatePayload: any = {};

    if (updateDto.title !== undefined) updatePayload.title = updateDto.title;
    if (updateDto.slug !== undefined) updatePayload.slug = updateDto.slug;
    if (updateDto.company !== undefined) updatePayload.company = updateDto.company;
    if (updateDto.sector !== undefined) updatePayload.sector = updateDto.sector;
    if (updateDto.type !== undefined) updatePayload.type = updateDto.type;
    if (updateDto.location !== undefined) updatePayload.location = updateDto.location;
    if (updateDto.description !== undefined) updatePayload.description = updateDto.description;
    if (updateDto.shortDescription !== undefined) updatePayload.shortDescription = updateDto.shortDescription;
    if (updateDto.rate !== undefined) updatePayload.rate = updateDto.rate;
    if (updateDto.minInvestment !== undefined) updatePayload.minInvestment = updateDto.minInvestment;
    if (updateDto.maxInvestment !== undefined) updatePayload.maxInvestment = updateDto.maxInvestment;
    if (updateDto.termMonths !== undefined) updatePayload.termMonths = updateDto.termMonths;
    if (updateDto.totalFundingTarget !== undefined) updatePayload.totalFundingTarget = updateDto.totalFundingTarget;
    if (updateDto.paymentFrequency !== undefined) updatePayload.paymentFrequency = updateDto.paymentFrequency;
    if (updateDto.bondStructure !== undefined) updatePayload.bondStructure = updateDto.bondStructure;
    if (updateDto.creditRating !== undefined) updatePayload.creditRating = updateDto.creditRating;
    if (updateDto.earlyRedemptionAllowed !== undefined) updatePayload.earlyRedemptionAllowed = updateDto.earlyRedemptionAllowed;
    if (updateDto.earlyRedemptionPenalty !== undefined) updatePayload.earlyRedemptionPenalty = updateDto.earlyRedemptionPenalty;
    if (updateDto.status !== undefined) updatePayload.status = updateDto.status;
    if (updateDto.startDate !== undefined) updatePayload.startDate = new Date(updateDto.startDate);
    if (updateDto.endDate !== undefined) updatePayload.endDate = updateDto.endDate ? new Date(updateDto.endDate) : null;
    if (updateDto.riskLevel !== undefined) updatePayload.riskLevel = updateDto.riskLevel;
    if (updateDto.companyDescription !== undefined) updatePayload.companyDescription = updateDto.companyDescription;
    if (updateDto.companyWebsite !== undefined) updatePayload.companyWebsite = updateDto.companyWebsite;
    if (updateDto.companyAddress !== undefined) updatePayload.companyAddress = updateDto.companyAddress;
    if (updateDto.projectType !== undefined) updatePayload.projectType = updateDto.projectType;
    if (updateDto.useOfFunds !== undefined) updatePayload.useOfFunds = updateDto.useOfFunds;
    if (updateDto.keyHighlights !== undefined) updatePayload.keyHighlights = updateDto.keyHighlights;
    if (updateDto.riskFactors !== undefined) updatePayload.riskFactors = updateDto.riskFactors;
    if (updateDto.legalStructure !== undefined) updatePayload.legalStructure = updateDto.legalStructure;
    if (updateDto.jurisdiction !== undefined) updatePayload.jurisdiction = updateDto.jurisdiction;
    if (updateDto.thumbnailImage !== undefined) updatePayload.thumbnailImage = updateDto.thumbnailImage;
    if (updateDto.logo !== undefined) updatePayload.logo = updateDto.logo;
    if (updateDto.images !== undefined) updatePayload.images = updateDto.images;
    if (updateDto.videoUrl !== undefined) updatePayload.videoUrl = updateDto.videoUrl;
    if (updateDto.isFeatured !== undefined) updatePayload.isFeatured = updateDto.isFeatured;
    if (updateDto.faq !== undefined) updatePayload.faq = updateDto.faq;
    if (updateDto.milestones !== undefined) {
      updatePayload.milestones = updateDto.milestones.map((m) => ({
        date: m.date,
        description: m.description,
        status: 'pending' as const,
      }));
    }
    if (updateDto.tags !== undefined) updatePayload.tags = updateDto.tags;
    if (updateDto.relatedOpportunities !== undefined) updatePayload.relatedOpportunities = updateDto.relatedOpportunities;
    if (updateDto.seoTitle !== undefined) updatePayload.seoTitle = updateDto.seoTitle;
    if (updateDto.seoDescription !== undefined) updatePayload.seoDescription = updateDto.seoDescription;

    updatePayload.updatedAt = new Date();

    // Use MongoDB manager's native updateOne
    const mongoManager = this.dataSource.mongoManager;
    await mongoManager.getMongoRepository(InvestmentOpportunity).updateOne(
      { id },
      { $set: updatePayload },
    );

    // Fetch and return updated opportunity
    const updated = await this.opportunityRepository.findOne({
      where: { id },
    });

    if (!updated) {
      throw new NotFoundException('Investment opportunity not found after update');
    }

    // Clear dropdown cache since an opportunity was updated
    this.clearDropdownCache();

    return updated;
  }

  async delete(id: string): Promise<void> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id },
    });

    if (!opportunity) {
      throw new NotFoundException('Investment opportunity not found');
    }

    // Delete associated documents
    await this.documentRepository.delete({ opportunityId: id });

    // Delete the opportunity
    await this.opportunityRepository.delete({ id });

    // Clear dropdown cache since an opportunity was deleted
    this.clearDropdownCache();
  }

  async getFeatured(limit: number = 6) {
    const allOpportunities = await this.opportunityRepository.find();
    const featured = allOpportunities
      .filter((opp) => opp.isFeatured === true)
      .sort((a, b) => {
        const aDate = a.createdAt?.getTime() || 0;
        const bDate = b.createdAt?.getTime() || 0;
        return bDate - aDate;
      })
      .slice(0, limit);

    return featured.map((opp) => this.mapToListItem(opp));
  }

  async getUpcoming() {
    const allOpportunities = await this.opportunityRepository.find();
    const upcoming = allOpportunities
      .filter((opp) => opp.status === InvestmentOpportunityStatus.UPCOMING)
      .sort((a, b) => {
        const aDate = a.startDate?.getTime() || 0;
        const bDate = b.startDate?.getTime() || 0;
        return aDate - bDate;
      });

    return upcoming.map((opp) => this.mapToListItem(opp));
  }

  async getDropdown(query: QueryDropdownDto): Promise<{ opportunities: Array<{ id: string; title: string }> }> {
    // Generate cache key from query parameters
    const cacheKey = `dropdown:${JSON.stringify(query)}`;
    
    // Check cache
    const cached = this.dropdownCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // For MongoDB with TypeORM, use find with select to get only needed fields
    // This is more efficient than loading all fields
    const allOpportunities = await this.opportunityRepository.find({
      select: ['id', 'title', 'status'],
    });

    let filtered = allOpportunities;

    // Apply status filter (supports comma-separated values)
    if (query.status) {
      const statuses = query.status
        .split(',')
        .map((s) => s.trim())
        .filter((s) => Object.values(InvestmentOpportunityStatus).includes(s as InvestmentOpportunityStatus));
      
      if (statuses.length > 0) {
        filtered = filtered.filter((opp) => statuses.includes(opp.status));
      }
    }

    // Apply search filter (case-insensitive title search)
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter((opp) =>
        opp.title?.toLowerCase().includes(searchLower),
      );
    }

    // Sort alphabetically by title (ascending)
    filtered.sort((a, b) => {
      const titleA = a.title?.toLowerCase() || '';
      const titleB = b.title?.toLowerCase() || '';
      return titleA.localeCompare(titleB);
    });

    // Map to dropdown format (only id and title)
    const opportunities = filtered.map((opp) => ({
      id: opp.id,
      title: opp.title,
    }));

    const result = { opportunities };

    // Cache the result
    this.dropdownCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + this.CACHE_TTL,
    });

    // Clean up expired cache entries periodically
    if (this.dropdownCache.size > 100) {
      const now = Date.now();
      for (const [key, entry] of this.dropdownCache.entries()) {
        if (entry.expiresAt <= now) {
          this.dropdownCache.delete(key);
        }
      }
    }

    return result;
  }

  /**
   * Clear dropdown cache - call this when opportunities are created/updated/deleted
   */
  private clearDropdownCache(): void {
    this.dropdownCache.clear();
  }

  async uploadDocument(
    opportunityId: string,
    file: Express.Multer.File,
    name: string,
    category: string,
    adminId: string,
  ): Promise<InvestmentOpportunityDocument> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityId },
    });

    if (!opportunity) {
      throw new NotFoundException('Investment opportunity not found');
    }

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

    // Determine document type
    const documentType = this.getDocumentType(file.originalname);

    // Generate ID manually for MongoDB compatibility
    const documentId = randomUUID();
    const now = new Date();

    const documentData: any = {
      _id: documentId,
      id: documentId,
      opportunityId,
      name,
      type: documentType,
      url,
      category,
      size: file.size,
      uploadedAt: now,
      uploadedBy: adminId,
    };

    // Use MongoDB manager's native insertOne
    const mongoManager = this.dataSource.mongoManager;
    await mongoManager.getMongoRepository(InvestmentOpportunityDocument).insertOne(documentData);

    // Fetch and return the created document
    const created = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!created) {
      throw new BadRequestException('Failed to create document');
    }

    return created;
  }

  async deleteDocument(opportunityId: string, documentId: string) {
    const document = await this.documentRepository.findOne({
      where: { id: documentId, opportunityId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Delete file from filesystem
    if (document.url) {
      await this.fileUploadService.deleteFile(document.url);
    }

    // Delete document record
    await this.documentRepository.delete({ id: documentId });
  }

  private mapToListItem(opp: InvestmentOpportunity) {
    // Include contractAddress in list items for blockchain operations
    const currentFunding = Number(opp.currentFunding) || 0;
    const totalFundingTarget = Number(opp.totalFundingTarget) || 1;
    const fundingProgress = (currentFunding / totalFundingTarget) * 100;

    return {
      id: opp.id,
      title: opp.title,
      company: opp.company,
      sector: opp.sector,
      type: opp.type,
      location: opp.location,
      rate: Number(opp.rate),
      minInvestment: Number(opp.minInvestment),
      maxInvestment: opp.maxInvestment ? Number(opp.maxInvestment) : undefined,
      termMonths: opp.termMonths,
      totalFundingTarget: Number(opp.totalFundingTarget),
      currentFunding: currentFunding,
      status: opp.status,
      startDate: opp.startDate?.toISOString(),
      endDate: opp.endDate?.toISOString(),
      investorsCount: opp.investorsCount,
      fundingProgress: Math.min(100, Math.max(0, fundingProgress)),
      riskLevel: opp.riskLevel,
      thumbnailImage: opp.thumbnailImage,
      logo: opp.logo,
      isFeatured: opp.isFeatured,
      contractAddress: opp.contractAddress || undefined, // Include contract address for blockchain operations
      createdAt: opp.createdAt?.toISOString(),
      updatedAt: opp.updatedAt?.toISOString(),
    };
  }

  private mapToDetail(
    opp: InvestmentOpportunity,
    documents: InvestmentOpportunityDocument[],
  ) {
    const listItem = this.mapToListItem(opp);

    return {
      ...listItem,
      description: opp.description,
      shortDescription: opp.shortDescription,
      paymentFrequency: opp.paymentFrequency,
      bondStructure: opp.bondStructure,
      creditRating: opp.creditRating,
      earlyRedemptionAllowed: opp.earlyRedemptionAllowed,
      earlyRedemptionPenalty: opp.earlyRedemptionPenalty
        ? Number(opp.earlyRedemptionPenalty)
        : undefined,
      companyDescription: opp.companyDescription,
      companyWebsite: opp.companyWebsite,
      companyAddress: opp.companyAddress,
      projectType: opp.projectType,
      useOfFunds: opp.useOfFunds,
      keyHighlights: opp.keyHighlights || [],
      riskFactors: opp.riskFactors || [],
      legalStructure: opp.legalStructure,
      jurisdiction: opp.jurisdiction,
      images: opp.images || [],
      videoUrl: opp.videoUrl,
      documents: documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        url: doc.url,
        category: doc.category,
        size: doc.size,
        uploadedAt: doc.uploadedAt?.toISOString(),
      })),
      faq: opp.faq || [],
      averageInvestment: opp.averageInvestment ? Number(opp.averageInvestment) : undefined,
      medianInvestment: opp.medianInvestment ? Number(opp.medianInvestment) : undefined,
      largestInvestment: opp.largestInvestment ? Number(opp.largestInvestment) : undefined,
      milestones: opp.milestones || [],
      relatedOpportunities: opp.relatedOpportunities || [],
      tags: opp.tags || [],
      slug: opp.slug,
      seoTitle: opp.seoTitle,
      seoDescription: opp.seoDescription,
    };
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private getDocumentType(filename: string): InvestmentOpportunityDocumentType {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return InvestmentOpportunityDocumentType.PDF;
    if (ext === 'doc' || ext === 'docx') return InvestmentOpportunityDocumentType.DOC;
    if (ext === 'xls' || ext === 'xlsx') return InvestmentOpportunityDocumentType.XLS;
    return InvestmentOpportunityDocumentType.OTHER;
  }
}

