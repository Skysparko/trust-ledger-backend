import { PartialType } from '@nestjs/mapped-types';
import { CreateInvestmentOpportunityDto } from './create-investment-opportunity.dto';

export class UpdateInvestmentOpportunityDto extends PartialType(
  CreateInvestmentOpportunityDto,
) {}

