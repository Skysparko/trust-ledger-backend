import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { ObjectId } from 'mongodb';

export enum InvestmentOpportunityDocumentType {
  PDF = 'pdf',
  DOC = 'doc',
  XLS = 'xls',
  OTHER = 'other',
}

export enum InvestmentOpportunityDocumentCategory {
  LEGAL = 'legal',
  FINANCIAL = 'financial',
  PROJECT = 'project',
  PROSPECTUS = 'prospectus',
  OTHER = 'other',
}

@Entity('investment_opportunity_documents')
export class InvestmentOpportunityDocument {
  @PrimaryColumn({ type: 'string' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new ObjectId().toString();
    }
  }

  @Column()
  opportunityId: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: InvestmentOpportunityDocumentType,
  })
  type: InvestmentOpportunityDocumentType;

  @Column()
  url: string;

  @Column({
    type: 'enum',
    enum: InvestmentOpportunityDocumentCategory,
  })
  category: InvestmentOpportunityDocumentCategory;

  @Column()
  size: number; // in bytes

  @CreateDateColumn()
  uploadedAt: Date;

  @Column({ nullable: true })
  uploadedBy: string; // Admin ID
}

