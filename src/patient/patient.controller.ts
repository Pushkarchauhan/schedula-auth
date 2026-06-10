import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/user.entity';
import { PatientService } from './patient.service';
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';

@Controller('patient')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  // POST /patient/profile — Create profile (onboarding)
  @Post('profile')
  async createProfile(@Request() req, @Body() dto: CreatePatientProfileDto) {
    const profile = await this.patientService.createProfile(req.user.id, dto);
    return {
      success: true,
      message: 'Patient profile created successfully.',
      data: profile,
    };
  }

  // GET /patient/profile — Get own profile
  @Get('profile')
  async getProfile(@Request() req) {
    const profile = await this.patientService.getProfile(req.user.id);
    return {
      success: true,
      data: profile,
    };
  }

  // PATCH /patient/profile — Update profile
  @Patch('profile')
  async updateProfile(@Request() req, @Body() dto: UpdatePatientProfileDto) {
    const profile = await this.patientService.updateProfile(req.user.id, dto);
    return {
      success: true,
      message: 'Patient profile updated successfully.',
      data: profile,
    };
  }
}
