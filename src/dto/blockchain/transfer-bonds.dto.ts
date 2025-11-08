import { IsString, IsNumber, Min } from 'class-validator';

export class TransferBondsDto {
  @IsString()
  opportunityId: string;

  @IsString()
  fromAddress: string;

  @IsString()
  toAddress: string;

  @IsNumber()
  @Min(1)
  amount: number;
}

