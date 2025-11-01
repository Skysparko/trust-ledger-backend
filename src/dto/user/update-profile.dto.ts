import { IsEmail, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BankDto {
  @IsString()
  iban: string;

  @IsString()
  accountName: string;

  @IsString()
  @IsOptional()
  bic?: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @ValidateNested()
  @Type(() => BankDto)
  @IsOptional()
  bank?: BankDto;

  @IsString()
  @IsOptional()
  walletAddress?: string;

  @IsString()
  @IsOptional()
  walletNetwork?: string;
}

