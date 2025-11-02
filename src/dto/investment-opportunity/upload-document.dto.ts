import { IsString, IsEnum } from 'class-validator';
import { InvestmentOpportunityDocumentCategory } from '../../entities/investment-opportunity-document.entity';

export class UploadDocumentDto {
  @IsString()
  name: string;

  @IsEnum(InvestmentOpportunityDocumentCategory)
  category: InvestmentOpportunityDocumentCategory;
}

