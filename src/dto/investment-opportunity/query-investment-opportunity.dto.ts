import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  InvestmentOpportunityStatus,
  RiskLevel,
} from '../../entities/investment-opportunity.entity';

export enum SortBy {
  CREATED_AT = 'createdAt',
  START_DATE = 'startDate',
  RATE = 'rate',
  CURRENT_FUNDING = 'currentFunding',
  POPULARITY = 'popularity',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryInvestmentOpportunityDto {
  @IsEnum(InvestmentOpportunityStatus)
  @IsOptional()
  status?: InvestmentOpportunityStatus;

  @IsString()
  @IsOptional()
  sector?: string;

  @IsEnum(RiskLevel)
  @IsOptional()
  riskLevel?: RiskLevel;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  @Max(100)
  minRate?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  @Max(100)
  maxRate?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsEnum(SortBy)
  @IsOptional()
  sortBy?: SortBy;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;

  @IsString()
  @IsOptional()
  search?: string;
}

