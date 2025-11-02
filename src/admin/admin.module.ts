import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { Investment } from '../entities/investment.entity';
import { Transaction } from '../entities/transaction.entity';
import { InvestmentOpportunity } from '../entities/investment-opportunity.entity';
import { Issuance } from '../entities/issuance.entity';
import { Project } from '../entities/project.entity';
import { Document } from '../entities/document.entity';
import { Webinar } from '../entities/webinar.entity';
import { Post } from '../entities/post.entity';
import { FileUploadService } from '../common/file-upload.service';
import { InvestmentConfirmationService } from './investment-confirmation.service';
import { EmailService } from '../common/email.service';
import { Asset } from '../entities/asset.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      Investment,
      Transaction,
      InvestmentOpportunity,
      Issuance,
      Project,
      Document,
      Webinar,
      Post,
      Asset,
    ]),
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    FileUploadService,
    InvestmentConfirmationService,
    EmailService,
  ],
  exports: [AdminService, InvestmentConfirmationService],
})
export class AdminModule {}

