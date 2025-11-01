import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin, AdminRole } from '../src/entities/admin.entity';
import { getTypeOrmConfig } from '../src/config/typeorm.config';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { randomUUID } from 'crypto';
import { DataSourceOptions } from 'typeorm';

// Load environment variables
config();

async function createAdmin() {
  const configService = new ConfigService();
  const typeormConfig = getTypeOrmConfig(configService);

  const dataSource = new DataSource(typeormConfig as DataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('Database connected');

    const adminRepository = dataSource.getRepository(Admin);

    // Check if admin already exists
    const existingAdmin = await adminRepository.findOne({
      where: { email: 'admin@example.com' },
    });

    const hashedPassword = await bcrypt.hash('adminpassword123', 10);

    if (existingAdmin) {
      console.log('Admin user already exists. Updating password...');
      const mongoManager = dataSource.mongoManager;
      await mongoManager.getMongoRepository(Admin).updateOne(
        { id: existingAdmin.id },
        {
          $set: {
            password: hashedPassword,
            isActive: true,
          },
        },
      );
      console.log('Admin password updated successfully!');
      console.log('Email: admin@example.com');
      console.log('Password: adminpassword123');
      await dataSource.destroy();
      return;
    }

    // Create admin user using MongoDB collection directly
    const adminId = randomUUID();
    
    const mongoManager = dataSource.mongoManager;
    await mongoManager.getMongoRepository(Admin).insertOne({
      _id: adminId,
      id: adminId,
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
      createdAt: new Date(),
    });

    console.log('Admin user created successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: adminpassword123');

    await dataSource.destroy();
  } catch (error) {
    console.error('Error creating admin:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

createAdmin();

