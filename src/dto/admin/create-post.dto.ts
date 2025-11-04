import { IsString, IsEnum, IsDateString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PostCategory } from '../../entities/post.entity';

export class CreatePostDto {
  @IsString()
  title: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Capitalize first letter, rest lowercase
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    }
    return value;
  })
  @IsEnum(PostCategory, {
    message: 'category must be one of the following values: News, Knowledge',
  })
  category: PostCategory;

  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') {
      return value;
    }
    // Try to parse and normalize date to ISO 8601 format
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') return value;
      // Try to parse the date string
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      return trimmed; // Return as-is if can't parse, let validator handle it
    }
    // If it's a number (timestamp), convert to ISO string
    if (typeof value === 'number') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    return value;
  })
  @IsDateString({}, { message: 'date must be a valid ISO 8601 date string' })
  date: string;

  @Transform(({ value }) => {
    if (value === null || value === undefined) {
      return value; // Let validation handle required fields
    }
    // Convert to string, handling various types
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    // For objects/arrays, try JSON.stringify
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  })
  @IsString({ message: 'excerpt must be a string' })
  excerpt: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  isPublished?: boolean;
}

