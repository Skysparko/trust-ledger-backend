import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issuance, IssuanceStatus, IssuanceType } from '../entities/issuance.entity';
import { Project } from '../entities/project.entity';
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
    // MongoDB doesn't support Query Builder, so we use find() and filter in memory
    const allIssuances = await this.issuanceRepository.find();

    let filteredIssuances = allIssuances;

    if (filters.status) {
      filteredIssuances = filteredIssuances.filter(
        (issuance) => issuance.status === filters.status,
      );
    }

    if (filters.type) {
      filteredIssuances = filteredIssuances.filter(
        (issuance) => issuance.type === filters.type,
      );
    }

    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      filteredIssuances = filteredIssuances.filter((issuance) =>
        issuance.location?.toLowerCase().includes(locationLower),
      );
    }

    // Sort by startDate descending
    filteredIssuances.sort((a, b) => {
      const aDate = a.startDate?.getTime() || 0;
      const bDate = b.startDate?.getTime() || 0;
      return bDate - aDate;
    });

    return filteredIssuances;
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
    type?: string;
    status?: string;
    location?: string;
  }) {
    // MongoDB doesn't support Query Builder, so we use find() and filter in memory
    const allProjects = await this.projectRepository.find();

    let filteredProjects = allProjects;

    if (filters.type) {
      filteredProjects = filteredProjects.filter(
        (project) => project.type === filters.type,
      );
    }

    if (filters.status) {
      filteredProjects = filteredProjects.filter(
        (project) => project.status === filters.status,
      );
    }

    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      filteredProjects = filteredProjects.filter((project) =>
        project.location?.toLowerCase().includes(locationLower),
      );
    }

    // Sort by createdAt descending
    filteredProjects.sort((a, b) => {
      const getDateValue = (date: Date | string | null | undefined): number => {
        if (!date) return 0;
        if (date instanceof Date) return date.getTime();
        if (typeof date === 'string') {
          const parsed = new Date(date);
          return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
        }
        return 0;
      };
      const aDate = getDateValue(a.createdAt);
      const bDate = getDateValue(b.createdAt);
      return bDate - aDate;
    });

    return filteredProjects;
  }

  async getPosts(category?: PostCategory) {
    // MongoDB doesn't support Query Builder, so we use find() and filter in memory
    const allPosts = await this.postRepository.find();

    let filteredPosts = allPosts;

    if (category) {
      filteredPosts = filteredPosts.filter(
        (post) => post.category === category,
      );
    }

    // Sort by date descending
    filteredPosts.sort((a, b) => {
      const aDate = a.date?.getTime() || 0;
      const bDate = b.date?.getTime() || 0;
      return bDate - aDate;
    });

    return filteredPosts;
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
      where: { isActive: true },
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

