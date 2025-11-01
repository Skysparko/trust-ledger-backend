import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserType } from '../../entities/user.entity';

export class SignupDto {
  @IsEnum(UserType)
  type: UserType;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

