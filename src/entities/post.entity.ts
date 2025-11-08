import {
  Entity,
  PrimaryColumn,
  Column,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ObjectId } from 'mongodb';

export enum PostCategory {
  NEWS = 'News',
  KNOWLEDGE = 'Knowledge',
}

@Entity('posts')
export class Post {
  @PrimaryColumn({ type: 'string' })
  id: string;

  @Column()
  title: string;

  @Column()
  excerpt: string;

  @Column({ nullable: true })
  content: string;

  @Column()
  date: Date;

  @Column()
  category: PostCategory;

  @Column({ nullable: true })
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt: Date;

  @BeforeInsert()
  beforeInsert() {
    if (!this.id) {
      this.id = new ObjectId().toString();
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

