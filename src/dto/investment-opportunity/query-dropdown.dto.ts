import { IsString, IsOptional } from 'class-validator';
import { InvestmentOpportunityStatus } from '../../entities/investment-opportunity.entity';

export class QueryDropdownDto {
  @IsString()
  @IsOptional()
  status?: string; // Comma-separated values like "active,upcoming"

  @IsString()
  @IsOptional()
  search?: string; // Search by title (case-insensitive)
}

