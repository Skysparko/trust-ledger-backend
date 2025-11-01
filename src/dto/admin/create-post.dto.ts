import { IsString, IsEnum, IsDateString, IsOptional } from 'class-validator';
import { PostCategory } from '../../entities/post.entity';

export class CreatePostDto {
  @IsString()
  title: string;

  @IsEnum(PostCategory)
  category: PostCategory;

  @IsDateString()
  date: string;

  @IsString()
  excerpt: string;

  @IsString()
  @IsOptional()
  content?: string;
}

