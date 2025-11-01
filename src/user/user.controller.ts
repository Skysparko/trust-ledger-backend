import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  Query,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserAuthGuard } from '../auth/user-auth.guard';
import { UpdateProfileDto } from '../dto/user/update-profile.dto';
import { CreateInvestmentDto } from '../dto/user/create-investment.dto';
import { WalletNetwork } from '../entities/user-profile.entity';

@Controller('api/user')
@UseGuards(JwtAuthGuard, UserAuthGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    return this.userService.getProfile(req.user.id);
  }

  @Put('profile')
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(req.user.id, updateProfileDto);
  }

  @Post('kyc-upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadKYC(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('File is required');
    }
    return this.userService.uploadKYC(req.user.id, file);
  }

  @Put('agreement-sign')
  async signAgreement(@Request() req) {
    return this.userService.signAgreement(req.user.id);
  }

  @Put('two-factor')
  async toggleTwoFactor(@Request() req, @Body() body: { enabled: boolean }) {
    return this.userService.toggleTwoFactor(req.user.id, body.enabled);
  }

  @Put('wallet')
  async updateWallet(
    @Request() req,
    @Body() body: { network: WalletNetwork; address: string },
  ) {
    return this.userService.updateWallet(
      req.user.id,
      body.address,
      body.network,
    );
  }

  @Get('investments')
  async getInvestments(@Request() req) {
    return this.userService.getInvestments(req.user.id);
  }

  @Post('investments')
  async createInvestment(
    @Request() req,
    @Body() createInvestmentDto: CreateInvestmentDto,
  ) {
    return this.userService.createInvestment(
      req.user.id,
      createInvestmentDto,
    );
  }

  @Get('transactions')
  async getTransactions(
    @Request() req,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.userService.getTransactions(req.user.id, type, status);
  }

  @Get('assets')
  async getAssets(@Request() req) {
    return this.userService.getAssets(req.user.id);
  }

  @Get('notifications')
  async getNotifications(@Request() req) {
    return this.userService.getNotifications(req.user.id);
  }

  @Put('notifications/:id/read')
  async markNotificationRead(
    @Request() req,
    @Param('id') notificationId: string,
  ) {
    return this.userService.markNotificationRead(req.user.id, notificationId);
  }

  @Put('notifications/read-all')
  async markAllNotificationsRead(@Request() req) {
    return this.userService.markAllNotificationsRead(req.user.id);
  }
}

