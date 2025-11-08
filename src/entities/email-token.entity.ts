import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { ObjectId } from 'mongodb';
import { User } from './user.entity';

export enum TokenType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}

@Entity('email_tokens')
@Index(['token', 'type'])
export class EmailToken {
  @PrimaryColumn({ type: 'string' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new ObjectId().toString();
    }
  }

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @Column()
  token: string;

  @Column({
    type: 'enum',
    enum: TokenType,
  })
  type: TokenType;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

