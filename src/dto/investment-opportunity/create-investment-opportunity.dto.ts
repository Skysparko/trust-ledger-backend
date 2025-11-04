import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  IsDateString,
  IsUrl,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  InvestmentOpportunityStatus,
  RiskLevel,
  PaymentFrequency,
} from '../../entities/investment-opportunity.entity';

class FAQDto {
  @IsString()
  question: string;

  @IsString()
  answer: string;
}

class MilestoneDto {
  @IsDateString()
  date: string;

  @IsString()
  description: string;
}

export class CreateInvestmentOpportunityDto {
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  company: string;

  @IsString()
  sector: string;

  @IsString()
  type: string;

  @IsString()
  location: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  // Financial Information
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @IsNumber()
  @Min(0.01)
  minInvestment: number;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  maxInvestment?: number;

  @IsNumber()
  @Min(1)
  @Max(600)
  termMonths: number;

  @IsNumber()
  @Min(0.01)
  totalFundingTarget: number;

  @IsEnum(PaymentFrequency)
  paymentFrequency: PaymentFrequency;

  @IsString()
  @IsOptional()
  bondStructure?: string;

  @IsString()
  @IsOptional()
  creditRating?: string;

  @IsBoolean()
  @IsOptional()
  earlyRedemptionAllowed?: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  earlyRedemptionPenalty?: number;

  // Status & Dates
  @IsEnum(InvestmentOpportunityStatus)
  @IsOptional()
  status?: InvestmentOpportunityStatus;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  // Risk
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  // Company Details
  @IsString()
  @IsOptional()
  companyDescription?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  companyWebsite?: string;

  @IsString()
  @IsOptional()
  companyAddress?: string;

  // Project Details
  @IsString()
  projectType: string;

  @IsString()
  useOfFunds: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keyHighlights?: string[];

  // Risk & Legal
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  riskFactors?: string[];

  @IsString()
  @IsOptional()
  legalStructure?: string;

  @IsString()
  @IsOptional()
  jurisdiction?: string;

  // Media
  @IsUrl({ require_tld: false })
  @IsOptional()
  thumbnailImage?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  logo?: string;

  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  @IsOptional()
  images?: string[];

  @IsUrl({ require_tld: false })
  @IsOptional()
  videoUrl?: string;

  // Flags
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  // Additional
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FAQDto)
  @IsOptional()
  faq?: FAQDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  @IsOptional()
  milestones?: MilestoneDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  relatedOpportunities?: string[];

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  seoTitle?: string;

  @IsString()
  @IsOptional()
  seoDescription?: string;
}

