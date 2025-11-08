import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { ObjectId } from 'mongodb';

export enum IssuanceType {
  WIND = 'Wind',
  SOLAR = 'Solar',
}

export enum IssuanceStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  UPCOMING = 'upcoming',
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

@Entity('issuances')
export class Issuance {
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

  @Column({
    type: 'enum',
    enum: IssuanceType,
  })
  type: IssuanceType;

  @Column()
  location: string;

  @Column('decimal', { precision: 5, scale: 2 })
  rate: number;

  @Column()
  termMonths: number;

  @Column('decimal', { precision: 15, scale: 2 })
  minInvestment: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  maxInvestment: number;

  @Column('decimal', { precision: 15, scale: 2 })
  totalFundingTarget: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  currentFunding: number;

  @Column({ default: 0 })
  investorsCount: number;

  @Column('text')
  description: string;

  @Column()
  company: string;

  @Column({
    type: 'enum',
    enum: IssuanceStatus,
    default: IssuanceStatus.UPCOMING,
  })
  status: IssuanceStatus;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: RiskLevel,
  })
  riskLevel: RiskLevel;

  @Column({ nullable: true })
  creditRating: string;

  @Column({
    type: 'enum',
    enum: PaymentFrequency,
  })
  paymentFrequency: PaymentFrequency;

  @Column()
  bondStructure: string;

  @Column()
  sector: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Note: Investments and Assets now reference InvestmentOpportunity instead of Issuance
  // Keeping these relationships commented out for reference but they are no longer used
  // @OneToMany(() => Investment, (investment) => investment.issuance)
  // investments: Investment[];

  // @OneToMany(() => Asset, (asset) => asset.issuance)
  // assets: Asset[];
}

