import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from './user.entity';
import { InvestmentOpportunity } from './investment-opportunity.entity';

export enum AssetType {
  ENERGY_TOKEN = 'Energy Token',
  BOND = 'Bond',
  CERTIFICATE = 'Certificate',
}

@Entity('assets')
export class Asset {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => User, (user) => user.assets)
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column()
  type: AssetType;

  @Column()
  quantity: number;

  @Column()
  value: number;

  @Column()
  dateAcquired: Date;

  @ManyToOne(() => InvestmentOpportunity, { nullable: true })
  @JoinColumn()
  investmentOpportunity: InvestmentOpportunity;

  @Column({ nullable: true })
  investmentOpportunityId: string;

  @Column({ nullable: true })
  createdAt: Date;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) {
      this.id = randomUUID();
    }
    if (!this.createdAt) {
      this.createdAt = new Date();
    }
  }
}

