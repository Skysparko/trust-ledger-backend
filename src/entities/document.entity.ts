import {
  Entity,
  PrimaryColumn,
  Column,
  BeforeInsert,
} from 'typeorm';
import { randomUUID } from 'crypto';

export enum DocumentType {
  PDF = 'pdf',
  DOC = 'doc',
  XLS = 'xls',
  OTHER = 'other',
}

export enum DocumentCategory {
  LEGAL = 'legal',
  FINANCIAL = 'financial',
  PROJECT = 'project',
  OTHER = 'other',
}

@Entity('documents')
export class Document {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  type: DocumentType;

  @Column()
  size: number;

  @Column()
  uploadedAt: Date;

  @Column()
  uploadedBy: string;

  @Column()
  category: DocumentCategory;

  @Column({ nullable: true })
  url: string;

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

