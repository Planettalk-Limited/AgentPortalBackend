import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Agent Portal API is running!';
  }

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Agent Portal Backend',
      version: '1.0.0',
    };
  }
}
