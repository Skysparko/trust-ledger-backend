import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { UserProfile } from './user-profile.entity';
import { Investment } from './investment.entity';
import { Transaction } from './transaction.entity';
import { Asset } from './asset.entity';
import { Notification } from './notification.entity';

export enum UserType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
}

@Entity('users')
export class User {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }

  @Column({
    type: 'enum',
    enum: UserType,
  })
  type: UserType;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ select: false })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date;

  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile: UserProfile;

  @OneToMany(() => Investment, (investment) => investment.user)
  investments: Investment[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => Asset, (asset) => asset.user)
  assets: Asset[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}

