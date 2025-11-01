import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, UserType } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { Admin } from '../entities/admin.entity';
import { EmailToken, TokenType } from '../entities/email-token.entity';
import { LoginDto } from '../dto/auth/login.dto';
import { SignupDto } from '../dto/auth/signup.dto';
import { ChangePasswordDto } from '../dto/auth/change-password.dto';
import { JwtPayload } from './jwt.strategy';
import { EmailService } from '../common/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    @InjectRepository(EmailToken)
    private emailTokenRepository: Repository<EmailToken>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'isActive', 'type', 'name'],
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (!user.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async validateAdmin(email: string, password: string): Promise<any> {
    const admin = await this.adminRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'role', 'name'],
    });

    if (admin && (await bcrypt.compare(password, admin.password))) {
      const { password: _, ...result } = admin;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userRepository.update({ id: user.id }, {
      lastLogin: new Date(),
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'user',
    };

    return {
      id: user.id,
      type: user.type,
      email: user.email,
      name: user.name,
      token: this.jwtService.sign(payload),
    };
  }

  async adminLogin(loginDto: LoginDto) {
    const admin = await this.validateAdmin(loginDto.email, loginDto.password);
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.adminRepository.update({ id: admin.id }, {
      lastLogin: new Date(),
    });

    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      type: 'admin',
    };

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      token: this.jwtService.sign(payload),
    };
  }

  async signup(signupDto: SignupDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: signupDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    const user = this.userRepository.create({
      type: signupDto.type,
      email: signupDto.email,
      name: signupDto.name,
      password: hashedPassword,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Create user profile
    const profile = this.profileRepository.create({
      userId: savedUser.id,
      name: savedUser.name,
      email: savedUser.email,
    });

    await this.profileRepository.save(profile);

    // Send verification email if enabled
    const emailVerificationEnabled = this.configService.get<boolean>(
      'EMAIL_VERIFICATION_ENABLED',
      true,
    );

    if (emailVerificationEnabled) {
      await this.sendVerificationEmail(savedUser.id, savedUser.email, savedUser.name);
    }

    const payload: JwtPayload = {
      sub: savedUser.id,
      email: savedUser.email,
      type: 'user',
    };

    return {
      id: savedUser.id,
      type: savedUser.type,
      email: savedUser.email,
      name: savedUser.name,
      token: this.jwtService.sign(payload),
    };
  }

  async sendVerificationEmail(userId: string, email: string, name: string): Promise<void> {
    const token = randomBytes(32).toString('hex');
    const expiryHours = this.configService.get<number>(
      'EMAIL_VERIFICATION_TOKEN_EXPIRY',
      24,
    );
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Invalidate previous verification tokens
    await this.emailTokenRepository.update(
      {
        userId,
        type: TokenType.EMAIL_VERIFICATION,
        used: false,
      },
      { used: true },
    );

    // Create new token
    const emailToken = this.emailTokenRepository.create({
      userId,
      token,
      type: TokenType.EMAIL_VERIFICATION,
      expiresAt,
      used: false,
    });

    await this.emailTokenRepository.save(emailToken);

    // Send email
    await this.emailService.sendVerificationEmail(email, token, name);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.userRepository.update({ id: userId }, { password: hashedPassword });

    return { success: true };
  }

  async resetPassword(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If email exists, reset link has been sent' };
    }

    const token = randomBytes(32).toString('hex');
    const expiryHours = this.configService.get<number>(
      'PASSWORD_RESET_TOKEN_EXPIRY',
      1,
    );
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Invalidate previous reset tokens
    await this.emailTokenRepository.update(
      {
        userId: user.id,
        type: TokenType.PASSWORD_RESET,
        used: false,
      },
      { used: true },
    );

    // Create new token
    const emailToken = this.emailTokenRepository.create({
      userId: user.id,
      token,
      type: TokenType.PASSWORD_RESET,
      expiresAt,
      used: false,
    });

    await this.emailTokenRepository.save(emailToken);

    // Send email
    await this.emailService.sendPasswordResetEmail(
      email,
      token,
      user.name,
    );

    return { message: 'If email exists, reset link has been sent' };
  }

  async verifyEmail(token: string) {
    const emailToken = await this.emailTokenRepository.findOne({
      where: {
        token,
        type: TokenType.EMAIL_VERIFICATION,
        used: false,
      },
      relations: ['user'],
    });

    if (!emailToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (emailToken.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    // Mark token as used
    emailToken.used = true;
    await this.emailTokenRepository.save(emailToken);

    // TODO: Mark user as verified in user profile if needed
    return { success: true };
  }

  async resetPasswordWithToken(token: string, newPassword: string) {
    const emailToken = await this.emailTokenRepository.findOne({
      where: {
        token,
        type: TokenType.PASSWORD_RESET,
        used: false,
      },
      relations: ['user'],
    });

    if (!emailToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (emailToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Mark token as used
    emailToken.used = true;
    await this.emailTokenRepository.save(emailToken);

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update({ id: emailToken.userId }, {
      password: hashedPassword,
    });

    return { success: true };
  }
}

