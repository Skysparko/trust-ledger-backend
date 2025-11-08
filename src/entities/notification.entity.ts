import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { ObjectId } from 'mongodb';
import { User } from './user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryColumn({ type: 'string' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = new ObjectId().toString();
    }
  }

  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ default: false })
  read: boolean;

  @Column({ nullable: true })
  type: string;

  @Column({ nullable: true })
  link: string;

  @CreateDateColumn()
  createdAt: Date;
}

