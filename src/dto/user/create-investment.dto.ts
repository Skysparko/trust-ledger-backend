import { IsEnum, IsNumber, IsString, Min, IsOptional } from 'class-validator';
import { PaymentMethod } from '../../entities/investment.entity';

export class CreateInvestmentDto {
  @IsString()
  investmentOpportunityId: string;

  @IsNumber()
  @Min(1)
  bonds: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  walletAddress: string; // Wallet address to mint bonds to (required)
}

