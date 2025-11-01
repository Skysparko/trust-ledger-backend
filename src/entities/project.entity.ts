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
  IN_DEVELOPMENT = 'In development',
  LIVE = 'Live',
  COMPLETED = 'Completed',
}

@Entity('projects')
export class Project {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column()
  type: ProjectType;

  @Column()
  location: string;

  @Column()
  status: ProjectStatus;

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
      this.status = ProjectStatus.IN_DEVELOPMENT;
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

