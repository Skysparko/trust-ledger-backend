import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { Investment } from './investment.entity';
import { Asset } from './asset.entity';

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
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
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

  @OneToMany(() => Investment, (investment) => investment.issuance)
  investments: Investment[];

  @OneToMany(() => Asset, (asset) => asset.issuance)
  assets: Asset[];
}

