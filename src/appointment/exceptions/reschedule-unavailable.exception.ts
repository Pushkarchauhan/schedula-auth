import { BadRequestException } from '@nestjs/common';

export class RescheduleUnavailableException extends BadRequestException {
  constructor(message: string, suggestion: Record<string, unknown>) {
    super({
      success: false,
      message,
      suggestion,
    });
  }
}
