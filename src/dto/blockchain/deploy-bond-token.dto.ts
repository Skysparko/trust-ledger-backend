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
  couponRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  bondPrice?: number;
}

