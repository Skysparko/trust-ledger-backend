import { IsString, IsDateString, IsOptional, IsUrl, IsNumber, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateWebinarDto {
  @IsString()
  title: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  speaker?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  link?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  duration?: number;

  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

