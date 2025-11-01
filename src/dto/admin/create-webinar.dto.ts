import { IsString, IsDateString, IsOptional, IsUrl } from 'class-validator';

export class CreateWebinarDto {
  @IsString()
  title: string;

  @IsDateString()
  date: string;

  @IsString()
  speaker: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  link?: string;
}

