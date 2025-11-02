import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InvestmentOpportunityService } from './investment-opportunity.service';
import { CreateInvestmentOpportunityDto } from '../dto/investment-opportunity/create-investment-opportunity.dto';
import { UpdateInvestmentOpportunityDto } from '../dto/investment-opportunity/update-investment-opportunity.dto';
import { QueryInvestmentOpportunityDto } from '../dto/investment-opportunity/query-investment-opportunity.dto';
import { QueryDropdownDto } from '../dto/investment-opportunity/query-dropdown.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';

@Controller('api/investment-opportunities')
export class InvestmentOpportunityController {
  constructor(
    private readonly investmentOpportunityService: InvestmentOpportunityService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(@Query() query: QueryInvestmentOpportunityDto) {
    const result = await this.investmentOpportunityService.findAll(query);
    return {
      success: true,
      data: result,
    };
  }

  @Get('featured')
  @UseGuards(OptionalJwtAuthGuard)
  async getFeatured(@Query('limit') limit?: number) {
    const result = await this.investmentOpportunityService.getFeatured(
      limit ? parseInt(limit.toString()) : 6,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Get('upcoming')
  @UseGuards(JwtAuthGuard)
  async getUpcoming() {
    const result = await this.investmentOpportunityService.getUpcoming();
    return {
      success: true,
      data: result,
    };
  }

  @Get('dropdown')
  @UseGuards(OptionalJwtAuthGuard)
  async getDropdown(@Query() query: QueryDropdownDto) {
    const result = await this.investmentOpportunityService.getDropdown(query);
    return result;
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const result = await this.investmentOpportunityService.findOne(id);
    return {
      success: true,
      data: result,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async create(
    @Body() createDto: CreateInvestmentOpportunityDto,
    @Request() req,
  ) {
    const result = await this.investmentOpportunityService.create(
      createDto,
      req.user.id,
    );
    return {
      success: true,
      data: result,
      message: 'Investment opportunity created successfully',
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInvestmentOpportunityDto,
  ) {
    const result = await this.investmentOpportunityService.update(id, updateDto);
    return {
      success: true,
      data: result,
      message: 'Investment opportunity updated successfully',
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async partialUpdate(
    @Param('id') id: string,
    @Body() updateDto: UpdateInvestmentOpportunityDto,
  ) {
    const result = await this.investmentOpportunityService.update(id, updateDto);
    return {
      success: true,
      data: result,
      message: 'Investment opportunity updated successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async delete(@Param('id') id: string) {
    await this.investmentOpportunityService.delete(id);
    return {
      success: true,
      data: null,
      message: 'Investment opportunity deleted successfully',
    };
  }

  @Post(':id/documents')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') opportunityId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { name: string; category: string },
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const result = await this.investmentOpportunityService.uploadDocument(
      opportunityId,
      file,
      body.name,
      body.category,
      req.user.id,
    );
    return {
      success: true,
      data: {
        id: result.id,
        name: result.name,
        type: result.type,
        url: result.url,
        category: result.category,
        size: result.size,
        uploadedAt: result.uploadedAt?.toISOString(),
      },
      message: 'Document uploaded successfully',
    };
  }

  @Delete(':id/documents/:documentId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async deleteDocument(
    @Param('id') opportunityId: string,
    @Param('documentId') documentId: string,
  ) {
    await this.investmentOpportunityService.deleteDocument(
      opportunityId,
      documentId,
    );
    return {
      success: true,
      data: null,
      message: 'Document deleted successfully',
    };
  }
}

