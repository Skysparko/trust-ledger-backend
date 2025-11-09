import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class DeployBondTokenDto {
  @IsString()
  opportunityId: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  symbol?: string;

  @IsNumber()
  @IsOptional()
  maturityDate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  couponRate?: number; // Annual interest rate as percentage (e.g., 7.5 for 7.5%). Will be converted to basis points internally.

  @IsNumber()
  @Min(0)
  @IsOptional()
  bondPrice?: number;
}

