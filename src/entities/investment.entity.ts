import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from './user.entity';
import { InvestmentOpportunity } from './investment-opportunity.entity';

export enum InvestmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  SEPA = 'sepa',
}

@Entity('investments')
export class Investment {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => User, (user) => user.investments)
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => InvestmentOpportunity)
  @JoinColumn()
  investmentOpportunity: InvestmentOpportunity;

  @Column()
  investmentOpportunityId: string;

  @Column()
  date: Date;

  @Column()
  amount: number;

  @Column()
  status: InvestmentStatus;

  @Column({ nullable: true })
  documentUrl: string;

  @Column({ nullable: true })
  bonds: number;

  @Column({ nullable: true })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt: Date;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) {
      this.id = randomUUID();
    }
    if (!this.status) {
      this.status = InvestmentStatus.PENDING;
    }
    if (!this.createdAt) {
      this.createdAt = new Date();
    }
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  setUpdatedAt() {
    this.updatedAt = new Date();
  }
}

