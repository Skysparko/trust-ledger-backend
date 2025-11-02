import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestmentOpportunityController } from './investment-opportunity.controller';
import { InvestmentOpportunityService } from './investment-opportunity.service';
import { InvestmentOpportunity } from '../entities/investment-opportunity.entity';
import { InvestmentOpportunityDocument } from '../entities/investment-opportunity-document.entity';
import { FileUploadService } from '../common/file-upload.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestmentOpportunity,
      InvestmentOpportunityDocument,
    ]),
  ],
  controllers: [InvestmentOpportunityController],
  providers: [InvestmentOpportunityService, FileUploadService],
  exports: [InvestmentOpportunityService],
})
export class InvestmentOpportunityModule {}

