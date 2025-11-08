import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ObjectId } from 'mongodb';

export enum InvestmentOpportunityStatus {
  ACTIVE = 'active',
  UPCOMING = 'upcoming',
  CLOSED = 'closed',
  PAUSED = 'paused',
}

export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}

export enum PaymentFrequency {
  MONTHLY = 'Monthly',
  QUARTERLY = 'Quarterly',
  ANNUALLY = 'Annually',
  AT_MATURITY = 'At Maturity',
}

@Entity('investment_opportunities')
export class InvestmentOpportunity {
  @PrimaryColumn({ type: 'string' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new ObjectId().toString();
    }
  }

  @Column()
  title: string;

  @Column({ unique: true, nullable: true })
  slug: string;

  @Column()
  company: string;

  @Column()
  sector: string;

  @Column()
  type: string; // e.g., "Bond", "Equity", "Convertible"

  @Column()
  location: string;

  @Column('text')
  description: string;

  @Column('text', { nullable: true })
  shortDescription: string;

  // Financial Information
  @Column('decimal', { precision: 5, scale: 2 })
  rate: number; // percentage

  @Column('decimal', { precision: 15, scale: 2 })
  minInvestment: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  maxInvestment: number;

  @Column()
  termMonths: number;

  @Column('decimal', { precision: 15, scale: 2 })
  totalFundingTarget: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  currentFunding: number;

  @Column({
    type: 'enum',
    enum: PaymentFrequency,
  })
  paymentFrequency: PaymentFrequency;

  @Column({ nullable: true })
  bondStructure: string;

  @Column({ nullable: true })
  creditRating: string;

  @Column({ default: false })
  earlyRedemptionAllowed: boolean;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  earlyRedemptionPenalty: number; // percentage

  // Status & Dates
  @Column({
    type: 'enum',
    enum: InvestmentOpportunityStatus,
    default: InvestmentOpportunityStatus.UPCOMING,
  })
  status: InvestmentOpportunityStatus;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  // Risk
  @Column({
    type: 'enum',
    enum: RiskLevel,
  })
  riskLevel: RiskLevel;

  // Company Details
  @Column('text', { nullable: true })
  companyDescription: string;

  @Column({ nullable: true })
  companyWebsite: string;

  @Column('text', { nullable: true })
  companyAddress: string;

  // Project Details
  @Column()
  projectType: string;

  @Column('text')
  useOfFunds: string;

  @Column({ type: 'simple-array', nullable: true })
  keyHighlights: string[];

  // Risk & Legal
  @Column({ type: 'simple-array', nullable: true })
  riskFactors: string[];

  @Column({ nullable: true })
  legalStructure: string;

  @Column({ nullable: true })
  jurisdiction: string;

  // Media
  @Column({ nullable: true })
  thumbnailImage: string; // URL

  @Column({ nullable: true })
  logo: string; // URL

  @Column({ type: 'simple-array', nullable: true })
  images: string[]; // Array of URLs

  @Column({ nullable: true })
  videoUrl: string; // URL

  // Flags
  @Column({ default: false })
  isFeatured: boolean;

  // Statistics (calculated)
  @Column({ default: 0 })
  investorsCount: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  averageInvestment: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  medianInvestment: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  largestInvestment: number;

  // Additional
  @Column({ type: 'jsonb', nullable: true })
  faq: Array<{ question: string; answer: string }>;

  @Column({ type: 'jsonb', nullable: true })
  milestones: Array<{
    date: string;
    description: string;
    status: 'completed' | 'upcoming' | 'pending';
  }>;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'simple-array', nullable: true })
  relatedOpportunities: string[]; // Array of IDs

  // SEO
  @Column({ nullable: true })
  seoTitle: string;

  @Column('text', { nullable: true })
  seoDescription: string;

  // Blockchain
  @Column({ nullable: true })
  contractAddress: string; // BondToken contract address on Sonic

  @Column({ nullable: true })
  contractDeploymentTx: string; // Transaction hash of contract deployment

  // Metadata
  @Column({ nullable: true })
  createdBy: string; // Admin ID

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeUpdate()
  setUpdatedAt() {
    this.updatedAt = new Date();
  }
}

