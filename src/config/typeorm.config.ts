import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { Admin } from '../entities/admin.entity';
import { EmailToken } from '../entities/email-token.entity';
import { Investment } from '../entities/investment.entity';
import { Transaction } from '../entities/transaction.entity';
import { Issuance } from '../entities/issuance.entity';
import { Project } from '../entities/project.entity';
import { Document } from '../entities/document.entity';
import { Webinar } from '../entities/webinar.entity';
import { Post } from '../entities/post.entity';
import { Asset } from '../entities/asset.entity';
import { Notification } from '../entities/notification.entity';

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const uri = configService.get<string>('MONGODB_URI');
  const dbName = configService.get<string>('DB_NAME', 'trust_ledger');

  // Build MongoDB connection URL - properly construct with database name
  // TypeORM MongoDB driver expects database name in URL, not separate
  let url: string;
  if (!uri) {
    url = `mongodb://localhost:27017/${dbName}`;
  } else {
    // Parse URI to check if database name is already present
    try {
      const urlObj = new URL(uri);
      const pathname = urlObj.pathname;
      
      // If pathname is empty or just '/', add database name
      if (!pathname || pathname === '/') {
        urlObj.pathname = `/${dbName}`;
        url = urlObj.toString();
      } else if (pathname === `/${dbName}` || pathname.startsWith(`/${dbName}/`)) {
        // Database name already in URI, use as is
        url = uri;
      } else {
        // Different database name in URI, replace it
        urlObj.pathname = `/${dbName}`;
        url = urlObj.toString();
      }
    } catch (error) {
      // If URL parsing fails, fall back to string manipulation
      if (uri.includes('?')) {
        const [baseUri, queryString] = uri.split('?');
        const cleanBaseUri = baseUri.endsWith('/') ? baseUri.slice(0, -1) : baseUri;
        url = `${cleanBaseUri}/${dbName}?${queryString}`;
      } else {
        const cleanUri = uri.endsWith('/') ? uri.slice(0, -1) : uri;
        url = `${cleanUri}/${dbName}`;
      }
    }
  }

  return {
    type: 'mongodb',
    url: url,
    entities: [
      User,
      UserProfile,
      Admin,
      EmailToken,
      Investment,
      Transaction,
      Issuance,
      Project,
      Document,
      Webinar,
      Post,
      Asset,
      Notification,
    ],
    synchronize: configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
    logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
    retryAttempts: 3,
    retryDelay: 3000,
    autoLoadEntities: true,
  };
};

