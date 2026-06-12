import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/user.entity';
import { AvailabilityService } from './availability.service';
import { CreateRecurringAvailabilityDto } from './dto/create-recurring-availability.dto';
import { UpdateRecurringAvailabilityDto } from './dto/update-recurring-availability.dto';
import { CreateCustomAvailabilityDto } from './dto/create-custom-availability.dto';

@Controller('availability')   // ← changed from 'doctor/availability' to 'availability'
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // POST /availability
  @Post()
  async createRecurring(
    @Request() req,
    @Body() dto: CreateRecurringAvailabilityDto,
  ) {
    const slot = await this.availabilityService.createRecurring(req.user.id, dto);
    return {
      success: true,
      message: 'Recurring availability created successfully.',
      data: slot,
    };
  }

  // GET /availability
  @Get()
  async getRecurring(@Request() req) {
    const slots = await this.availabilityService.getRecurring(req.user.id);
    return {
      success: true,
      count: slots.length,
      data: slots,
    };
  }

  // PATCH /availability/:id
  @Patch(':id')
  async updateRecurring(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringAvailabilityDto,
  ) {
    const slot = await this.availabilityService.updateRecurring(req.user.id, id, dto);
    return {
      success: true,
      message: 'Recurring availability updated successfully.',
      data: slot,
    };
  }

  // DELETE /availability/:id
  @Delete(':id')
  async deleteRecurring(@Request() req, @Param('id') id: string) {
    await this.availabilityService.deleteRecurring(req.user.id, id);
    return {
      success: true,
      message: 'Recurring availability deleted successfully.',
    };
  }

  // POST /availability/override
  @Post('override')
  async createOverride(
    @Request() req,
    @Body() dto: CreateCustomAvailabilityDto,
  ) {
    const override = await this.availabilityService.createOverride(req.user.id, dto);
    return {
      success: true,
      message: 'Custom availability override created successfully.',
      data: override,
    };
  }

  // GET /availability/date?date=2026-06-15
  @Get('date')
  async getByDate(@Request() req, @Query('date') date: string) {
    if (!date) {
      return {
        success: false,
        message: 'Please provide date. e.g. ?date=2026-06-15',
      };
    }
    const result = await this.availabilityService.getByDate(req.user.id, date);
    return { success: true, data: result };
  }
}
