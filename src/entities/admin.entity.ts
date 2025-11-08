import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { ObjectId } from 'mongodb';

export enum AdminRole {
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

@Entity('admins')
export class Admin {
  @PrimaryColumn({ type: 'string' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new ObjectId().toString();
    }
  }

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: AdminRole,
    default: AdminRole.ADMIN,
  })
  role: AdminRole;

  @Column({ select: false })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date;
}

