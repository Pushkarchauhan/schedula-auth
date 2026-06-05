import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from './user.entity';
import { UsersService } from './users.service';

@Controller('patient')
@UseGuards(JwtAuthGuard, RolesGuard) 
@Roles(Role.PATIENT)                 
export class PatientController {
  constructor(private readonly usersService: UsersService) {}

  // GET /patient/profile
  @Get('profile')
  getProfile(@Request() req) {
    const patient = req.user;
    return {
      success: true,
      message: '🧑‍⚕️ Welcome to your Patient profile!',
      data: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        role: patient.role,
        dateOfBirth: patient.dateOfBirth,
        bloodGroup: patient.bloodGroup,
        memberSince: patient.createdAt,
      },
    };
  }

  // GET /patient/doctors
  @Get('doctors')
  async getAllDoctors() {
    const doctors = await this.usersService.findAllByRole(Role.DOCTOR);
    return {
      success: true,
      count: doctors.length,
      data: doctors.map((d) => ({
        id: d.id,
        name: d.name,
        email: d.email,
        specialization: d.specialization,
      })),
    };
  }
}
