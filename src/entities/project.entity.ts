import {
  Entity,
  PrimaryColumn,
  Column,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { randomUUID } from 'crypto';

export enum ProjectType {
  WIND = 'Wind',
  SOLAR = 'Solar',
}

export enum ProjectStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

@Entity('projects')
export class Project {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column()
  type: string;

  @Column()
  location: string;

  @Column()
  status: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true })
  sector: string;

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
      this.status = 'Active';
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

