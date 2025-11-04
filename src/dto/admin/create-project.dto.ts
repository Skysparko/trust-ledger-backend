import { IsString, IsOptional, ValidateIf } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @ValidateIf((o) => !o.name)
  title?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.title)
  name?: string;

  @IsString()
  type: string;

  @IsString()
  location: string;

  @IsString()
  status: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  sector?: string;
}

