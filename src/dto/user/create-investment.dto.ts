import { IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../../entities/investment.entity';

export class CreateInvestmentDto {
  @IsString()
  issuanceId: string;

  @IsNumber()
  @Min(1)
  bonds: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

