import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from './user.entity';

export enum KYCStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum WalletNetwork {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  BINANCE = 'binance',
  ARBITRUM = 'arbitrum',
}

@Entity('user_profiles')
export class UserProfile {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'jsonb', nullable: true })
  bank: {
    iban: string;
    accountName: string;
    bic?: string;
  };

  @Column({ nullable: true })
  kycDocumentName: string;

  @Column({ nullable: true })
  kycDocumentUrl: string;

  @Column({
    type: 'enum',
    enum: KYCStatus,
    default: KYCStatus.PENDING,
  })
  kycStatus: KYCStatus;

  @Column({ default: false })
  agreementSigned: boolean;

  @Column({ type: 'timestamp', nullable: true })
  agreementSignedAt: Date;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ nullable: true })
  walletAddress: string;

  @Column({
    type: 'enum',
    enum: WalletNetwork,
    nullable: true,
  })
  walletNetwork: WalletNetwork;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

