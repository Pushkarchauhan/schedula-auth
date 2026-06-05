import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from './user.entity';
import { UsersService } from './users.service';

@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard) // Both guards on all routes in this controller
@Roles(Role.DOCTOR)                  // Only DOCTOR can access
export class DoctorController {
  constructor(private readonly usersService: UsersService) {}

  // GET /doctor/profile
  @Get('profile')
  getProfile(@Request() req) {
    const doctor = req.user;
    return {
      success: true,
      message: '👨‍⚕️ Welcome to your Doctor profile!',
      data: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        role: doctor.role,
        specialization: doctor.specialization,
        licenseNumber: doctor.licenseNumber,
        memberSince: doctor.createdAt,
      },
    };
  }

  // GET /doctor/patients
  @Get('patients')
  async getAllPatients() {
    const patients = await this.usersService.findAllByRole(Role.PATIENT);
    return {
      success: true,
      count: patients.length,
      data: patients.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        dateOfBirth: p.dateOfBirth,
        bloodGroup: p.bloodGroup,
      })),
    };
  }
}
