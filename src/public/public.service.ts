import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issuance, IssuanceStatus, IssuanceType } from '../entities/issuance.entity';
import { Project, ProjectStatus, ProjectType } from '../entities/project.entity';
import { Post, PostCategory } from '../entities/post.entity';
import { Webinar } from '../entities/webinar.entity';
import { EmailService } from '../common/email.service';

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(Issuance)
    private issuanceRepository: Repository<Issuance>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(Webinar)
    private webinarRepository: Repository<Webinar>,
    private emailService: EmailService,
  ) {}

  async getIssuances(filters: {
    status?: IssuanceStatus;
    type?: IssuanceType;
    location?: string;
  }) {
    const queryBuilder = this.issuanceRepository.createQueryBuilder('issuance');

    if (filters.status) {
      queryBuilder.andWhere('issuance.status = :status', {
        status: filters.status,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere('issuance.type = :type', { type: filters.type });
    }

    if (filters.location) {
      queryBuilder.andWhere('issuance.location LIKE :location', {
        location: `%${filters.location}%`,
      });
    }

    queryBuilder.orderBy('issuance.startDate', 'DESC');

    return await queryBuilder.getMany();
  }

  async getIssuanceById(id: string) {
    const issuance = await this.issuanceRepository.findOne({
      where: { id },
    });

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    return issuance;
  }

  async getProjects(filters: {
    type?: ProjectType;
    status?: ProjectStatus;
    location?: string;
  }) {
    const queryBuilder = this.projectRepository.createQueryBuilder('project');

    if (filters.type) {
      queryBuilder.andWhere('project.type = :type', { type: filters.type });
    }

    if (filters.status) {
      queryBuilder.andWhere('project.status = :status', {
        status: filters.status,
      });
    }

    if (filters.location) {
      queryBuilder.andWhere('project.location LIKE :location', {
        location: `%${filters.location}%`,
      });
    }

    queryBuilder.orderBy('project.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }

  async getPosts(category?: PostCategory) {
    const queryBuilder = this.postRepository.createQueryBuilder('post');

    if (category) {
      queryBuilder.andWhere('post.category = :category', { category });
    }

    queryBuilder.orderBy('post.date', 'DESC');

    return await queryBuilder.getMany();
  }

  async getPostById(id: string) {
    const post = await this.postRepository.findOne({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async getWebinars() {
    return await this.webinarRepository.find({
      order: { date: 'DESC' },
    });
  }

  async subscribeNewsletter(email: string): Promise<void> {
    // TODO: Store newsletter subscription in database if needed
    await this.emailService.sendNewsletterConfirmation(email);
  }

  async requestBrochure(
    name: string,
    email: string,
    interest: string,
  ): Promise<void> {
    // TODO: Store brochure request in database if needed
    await this.emailService.sendBrochureRequest(name, email, interest);
  }
}

