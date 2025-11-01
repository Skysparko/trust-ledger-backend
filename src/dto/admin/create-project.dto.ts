import { IsString, IsEnum, IsDateString } from 'class-validator';
import { ProjectType, ProjectStatus } from '../../entities/project.entity';

export class CreateProjectDto {
  @IsString()
  title: string;

  @IsEnum(ProjectType)
  type: ProjectType;

  @IsString()
  location: string;

  @IsEnum(ProjectStatus)
  status: ProjectStatus;
}

