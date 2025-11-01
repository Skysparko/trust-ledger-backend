import { IsEnum } from 'class-validator';
import { KYCStatus } from '../../entities/user-profile.entity';

export class UpdateKYCStatusDto {
  @IsEnum(KYCStatus)
  status: KYCStatus;
}

