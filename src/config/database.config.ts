import { MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): MongooseModuleOptions => {
  const uri = configService.get<string>('MONGODB_URI');
  const dbName = configService.get<string>('DB_NAME', 'trust_ledger');

  // Construct URI properly - check if database name is already in URI
  let fullUri: string;
  if (!uri) {
    fullUri = `mongodb://localhost:27017/${dbName}`;
  } else {
    // Check if URI already contains database name after the last /
    const uriParts = uri.split('/');
    const lastPart = uriParts[uriParts.length - 1];
    
    // If last part contains ? or is empty or is just a database name, we need to set it
    if (!lastPart || lastPart.includes('?') || lastPart.trim() === '') {
      // No database name in URI, add it
      if (uri.includes('?')) {
        const [baseUri, queryString] = uri.split('?');
        fullUri = `${baseUri}/${dbName}?${queryString}`;
      } else {
        // Remove trailing slash if present
        const cleanUri = uri.endsWith('/') ? uri.slice(0, -1) : uri;
        fullUri = `${cleanUri}/${dbName}`;
      }
    } else {
      // Database name might already be in URI, use as is but ensure it's correct
      fullUri = uri;
    }
  }

  return {
    uri: fullUri,
    dbName: dbName,
    retryWrites: true,
    w: 'majority',
  };
};
