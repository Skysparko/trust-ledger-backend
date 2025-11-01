import { IsEmail, IsEnum, IsString } from 'class-validator';

export enum InterestType {
  WIND = 'wind',
  SOLAR = 'solar',
}

export class BrochureRequestDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsEnum(InterestType)
  interest: InterestType;
}

