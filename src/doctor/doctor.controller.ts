import {
  Body,
  Controller,
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
import { DoctorService } from './doctor.service';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { DoctorQueryDto } from './dto/doctor-query.dto';
import { SetSchedulingTypeDto } from './dto/set-scheduling-type.dto';

// ─── Public Routes ───────────────────────────────────────────
@Controller('doctor')
export class DoctorPublicController {
  constructor(private readonly doctorService: DoctorService) {}

  // GET /doctor — list all doctors
  @Get()
  async findAll(@Query() query: DoctorQueryDto) {
    const result = await this.doctorService.findAll(query);
    return { success: true, ...result };
  }

  // ⚠️ GET /doctor/:id must come LAST
  // to avoid conflicting with /doctor/profile or /doctor/availability
  @Get(':id')
  async findById(@Param('id') id: string) {
    const doctor = await this.doctorService.findById(id);
    return { success: true, data: doctor };
  }
}

// ─── Protected Routes (Doctor Only) ─────────────────────────
@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  // POST /doctor/profile
  @Post('profile')
  async createProfile(@Request() req, @Body() dto: CreateDoctorProfileDto) {
    const profile = await this.doctorService.createProfile(req.user.id, dto);
    return { success: true, message: 'Doctor profile created successfully.', data: profile };
  }

  // GET /doctor/profile
  @Get('profile')
  async getProfile(@Request() req) {
    const profile = await this.doctorService.getProfile(req.user.id);
    return { success: true, data: profile };
  }

  // PATCH /doctor/profile
  @Patch('profile')
  async updateProfile(@Request() req, @Body() dto: UpdateDoctorProfileDto) {
    const profile = await this.doctorService.updateProfile(req.user.id, dto);
    return { success: true, message: 'Doctor profile updated successfully.', data: profile };
  }

  // POST /doctor/scheduling
  @Post('scheduling')
  async setScheduling(@Request() req, @Body() dto: SetSchedulingTypeDto) {
    const profile = await this.doctorService.setSchedulingType(req.user.id, dto);
    return {
      success: true,
      message: 'Doctor scheduling configuration saved successfully.',
      data: profile,
    };
  }
}
