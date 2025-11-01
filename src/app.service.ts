import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AppService {
  constructor(@InjectConnection() private connection: Connection) {}

  getHealth() {
    return {
      status: 'ok',
      message: 'TrustLedger API is running',
      timestamp: new Date().toISOString(),
    };
  }

  async getHealthCheck() {
    let databaseStatus = 'unknown';
    try {
      if (this.connection.db) {
        await this.connection.db.admin().ping();
        databaseStatus = 'connected';
      } else {
        databaseStatus = 'disconnected';
      }
    } catch (error) {
      databaseStatus = 'disconnected';
    }

    return {
      status: databaseStatus === 'connected' ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: databaseStatus,
      },
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      },
    };
  }
}
