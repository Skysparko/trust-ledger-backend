import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class FileUploadService {
  private readonly uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>(
      'UPLOAD_DIR',
      './uploads',
    );

    // Create upload directories if they don't exist
    this.ensureDirectoryExists(path.join(this.uploadDir, 'kyc'));
    this.ensureDirectoryExists(path.join(this.uploadDir, 'documents'));
  }

  private ensureDirectoryExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  validateFile(file: Express.Multer.File, options?: {
    maxSize?: number;
    allowedMimeTypes?: string[];
  }): void {
    const maxSize = options?.maxSize || 10 * 1024 * 1024; // 10MB default
    const allowedMimeTypes = options?.allowedMimeTypes || [
      'image/jpeg',
      'image/png',
      'application/pdf',
    ];

    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum of ${maxSize / 1024 / 1024}MB`,
      );
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }
  }

  async saveFile(
    file: Express.Multer.File,
    subfolder: 'kyc' | 'documents',
  ): Promise<{ filename: string; url: string }> {
    const fileExtension = path.extname(file.originalname);
    const filename = `${randomUUID()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, subfolder, filename);

    fs.writeFileSync(filePath, file.buffer);

    const url = `/uploads/${subfolder}/${filename}`;
    return { filename, url };
  }

  async deleteFile(url: string): Promise<void> {
    const filePath = path.join(
      this.uploadDir,
      url.replace('/uploads/', ''),
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

