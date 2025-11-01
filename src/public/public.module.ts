import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { Issuance } from '../entities/issuance.entity';
import { Project } from '../entities/project.entity';
import { Post } from '../entities/post.entity';
import { Webinar } from '../entities/webinar.entity';
import { EmailService } from '../common/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Issuance, Project, Post, Webinar]),
  ],
  controllers: [PublicController],
  providers: [PublicService, EmailService],
  exports: [PublicService],
})
export class PublicModule {}

