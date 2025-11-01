import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { PublicService } from './public.service';
import { IssuanceStatus, IssuanceType } from '../entities/issuance.entity';
import { ProjectStatus, ProjectType } from '../entities/project.entity';
import { PostCategory } from '../entities/post.entity';

@Controller('api')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('issuances')
  async getIssuances(
    @Query('status') status?: IssuanceStatus,
    @Query('type') type?: IssuanceType,
    @Query('location') location?: string,
  ) {
    return this.publicService.getIssuances({ status, type, location });
  }

  @Get('issuances/:id')
  async getIssuanceById(@Param('id') id: string) {
    return this.publicService.getIssuanceById(id);
  }

  @Get('projects')
  async getProjects(
    @Query('type') type?: ProjectType,
    @Query('status') status?: ProjectStatus,
    @Query('location') location?: string,
  ) {
    return this.publicService.getProjects({ type, status, location });
  }

  @Get('posts')
  async getPosts(@Query('category') category?: PostCategory) {
    return this.publicService.getPosts(category);
  }

  @Get('posts/:id')
  async getPostById(@Param('id') id: string) {
    return this.publicService.getPostById(id);
  }

  @Get('webinars')
  async getWebinars() {
    return this.publicService.getWebinars();
  }

  @Post('newsletter/subscribe')
  async subscribeNewsletter(@Body() body: { email: string }) {
    await this.publicService.subscribeNewsletter(body.email);
    return { success: true };
  }

  @Post('brochure/request')
  async requestBrochure(@Body() body: { name: string; email: string; interest: string }) {
    await this.publicService.requestBrochure(body.name, body.email, body.interest);
    return { success: true };
  }
}

