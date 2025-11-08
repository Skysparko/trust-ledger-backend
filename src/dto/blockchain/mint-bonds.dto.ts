import { IsString, IsNumber, Min } from 'class-validator';

export class MintBondsDto {
  @IsString()
  opportunityId: string;

  @IsString()
  toAddress: string;

  @IsNumber()
  @Min(1)
  amount: number;
}

