import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { InvestmentConfirmationService } from './investment-confirmation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { CreateIssuanceDto } from '../dto/admin/create-issuance.dto';
import { CreateProjectDto } from '../dto/admin/create-project.dto';
import { CreateWebinarDto } from '../dto/admin/create-webinar.dto';
import { CreatePostDto } from '../dto/admin/create-post.dto';
import { UpdateKYCStatusDto } from '../dto/admin/update-kyc-status.dto';
import { UpdateUserStatusDto } from '../dto/admin/update-user-status.dto';
import { KYCStatus } from '../entities/user-profile.entity';
import { TransactionStatus } from '../entities/transaction.entity';
import { PaymentMethod } from '../entities/investment.entity';
import { DocumentCategory } from '../entities/document.entity';
import { PostCategory } from '../entities/post.entity';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, AdminAuthGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private investmentConfirmationService: InvestmentConfirmationService,
  ) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  async getUsers(
    @Query('search') search?: string,
    @Query('kycStatus') kycStatus?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Normalize kycStatus to enum value (handle both case and string matching)
    let normalizedKycStatus: KYCStatus | undefined;
    if (kycStatus) {
      const lowerStatus = kycStatus.toLowerCase();
      // Match enum values: 'pending', 'approved', 'rejected'
      const validStatuses = Object.values(KYCStatus) as string[];
      if (validStatuses.includes(lowerStatus)) {
        normalizedKycStatus = lowerStatus as KYCStatus;
      }
    }

    return this.adminService.getUsers({
      search,
      kycStatus: normalizedKycStatus,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Put('users/:id/kyc')
  async updateUserKYC(
    @Param('id') userId: string,
    @Body() updateKYCStatusDto: UpdateKYCStatusDto,
  ) {
    return this.adminService.updateUserKYCStatus(userId, updateKYCStatusDto.status);
  }

  @Put('users/:id/status')
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(userId, updateUserStatusDto.isActive);
  }

  @Get('transactions')
  async getTransactions(
    @Query('search') search?: string,
    @Query('status') status?: TransactionStatus,
    @Query('paymentMethod') paymentMethod?: PaymentMethod,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getTransactions({
      search,
      status,
      paymentMethod,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Get('transactions/export')
  async exportTransactions(
    @Query('format') format?: string,
    // Add other filter query params
  ) {
    // TODO: Implement CSV/Excel export
    return { message: 'Export not implemented yet' };
  }

  @Get('issuances')
  async getIssuances(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getIssuances({
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Post('issuances')
  async createIssuance(@Body() createIssuanceDto: CreateIssuanceDto) {
    return this.adminService.createIssuance(createIssuanceDto);
  }

  @Put('issuances/:id')
  async updateIssuance(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateIssuanceDto>,
  ) {
    return this.adminService.updateIssuance(id, updateData);
  }

  @Delete('issuances/:id')
  async deleteIssuance(@Param('id') id: string) {
    return this.adminService.deleteIssuance(id);
  }

  @Get('projects')
  async getProjects(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getProjects({
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Post('projects')
  async createProject(@Body() createProjectDto: CreateProjectDto) {
    return this.adminService.createProject(createProjectDto);
  }

  @Put('projects/:id')
  async updateProject(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateProjectDto>,
  ) {
    return this.adminService.updateProject(id, updateData);
  }

  @Delete('projects/:id')
  async deleteProject(@Param('id') id: string) {
    return this.adminService.deleteProject(id);
  }

  @Get('documents')
  async getDocuments(
    @Query('search') search?: string,
    @Query('category') category?: DocumentCategory,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getDocuments({
      search,
      category,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { category: DocumentCategory },
  ) {
    if (!file) {
      throw new Error('File is required');
    }
    return this.adminService.uploadDocument(req.user.id, file, body.category);
  }

  @Get('documents/:id/download')
  async downloadDocument(@Param('id') id: string) {
    // TODO: Implement file download
    return { message: 'Download not implemented yet' };
  }

  @Delete('documents/:id')
  async deleteDocument(@Param('id') id: string) {
    return this.adminService.deleteDocument(id);
  }

  @Get('webinars')
  async getWebinars(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getWebinars({
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Post('webinars')
  async createWebinar(@Body() createWebinarDto: CreateWebinarDto) {
    return this.adminService.createWebinar(createWebinarDto);
  }

  @Put('webinars/:id')
  async updateWebinar(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateWebinarDto>,
  ) {
    return this.adminService.updateWebinar(id, updateData);
  }

  @Delete('webinars/:id')
  async deleteWebinar(@Param('id') id: string) {
    return this.adminService.deleteWebinar(id);
  }

  @Get('posts')
  async getPosts(
    @Query('search') search?: string,
    @Query('category') category?: PostCategory,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getPosts({
      search,
      category,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  @Post('posts')
  async createPost(@Body() createPostDto: CreatePostDto) {
    return this.adminService.createPost(createPostDto);
  }

  @Put('posts/:id')
  async updatePost(
    @Param('id') id: string,
    @Body() updateData: Partial<CreatePostDto>,
  ) {
    return this.adminService.updatePost(id, updateData);
  }

  @Delete('posts/:id')
  async deletePost(@Param('id') id: string) {
    return this.adminService.deletePost(id);
  }

  @Put('investments/:id/confirm')
  async confirmInvestment(@Param('id') id: string) {
    return this.investmentConfirmationService.confirmInvestment(id);
  }

  @Put('investments/:id/cancel')
  async cancelInvestment(@Param('id') id: string) {
    return this.investmentConfirmationService.cancelInvestment(id);
  }
}

