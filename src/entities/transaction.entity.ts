import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ObjectId } from 'mongodb';
import { User } from './user.entity';
import { Investment } from './investment.entity';
import { PaymentMethod } from './investment.entity';

export enum TransactionType {
  DEPOSIT = 'Deposit',
  INVESTMENT = 'Investment',
  WITHDRAWAL = 'Withdrawal',
}

export enum TransactionStatus {
  COMPLETED = 'completed',
  PENDING = 'pending',
  FAILED = 'failed',
}

@Entity('transactions')
export class Transaction {
  @PrimaryColumn({ type: 'string' })
  id: string;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @Column()
  date: Date;

  @Column()
  type: TransactionType;

  @Column()
  amount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column()
  status: TransactionStatus;

  @Column()
  reference: string;

  @ManyToOne(() => Investment, { nullable: true })
  @JoinColumn()
  investment: Investment;

  @Column({ nullable: true })
  investmentId: string;

  @Column({ nullable: true })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt: Date;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) {
      this.id = new ObjectId().toString();
    }
    if (!this.status) {
      this.status = TransactionStatus.PENDING;
    }
    if (!this.currency) {
      this.currency = 'USD';
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

