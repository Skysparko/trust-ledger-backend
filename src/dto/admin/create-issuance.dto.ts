import {
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';
import {
  IssuanceType,
  IssuanceStatus,
  RiskLevel,
  PaymentFrequency,
} from '../../entities/issuance.entity';

export class CreateIssuanceDto {
  @IsString()
  title: string;

  @IsEnum(IssuanceType)
  type: IssuanceType;

  @IsString()
  location: string;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsNumber()
  @Min(1)
  termMonths: number;

  @IsNumber()
  @Min(0)
  minInvestment: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxInvestment?: number;

  @IsNumber()
  @Min(0)
  totalFundingTarget: number;

  @IsString()
  description: string;

  @IsString()
  company: string;

  @IsEnum(IssuanceStatus)
  status: IssuanceStatus;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @IsString()
  @IsOptional()
  creditRating?: string;

  @IsEnum(PaymentFrequency)
  paymentFrequency: PaymentFrequency;

  @IsString()
  bondStructure: string;

  @IsString()
  sector: string;
}

