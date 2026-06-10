import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHome() {
    return {
      application: 'Schedula Backend API',
      status: 'Running Successfully',
      version: '1.0.0',
    };
  }
}