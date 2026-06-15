import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/user.entity';
import { AppointmentService } from './appointment.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';

// ─── Patient Routes ───────────────────────────────────────────

@Controller('appointment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  async bookAppointment(@Request() req, @Body() dto: BookAppointmentDto) {
    const appointment = await this.appointmentService.bookAppointment(
      req.user.id,
      dto,
    );

    return {
      success: true,
      message: 'Appointment booked successfully.',
      data: appointment,
    };
  }

  @Get('my')
  async getMyAppointments(@Request() req) {
    const appointments = await this.appointmentService.getPatientAppointments(
      req.user.id,
    );

    return {
      success: true,
      count: appointments.length,
      data: appointments,
    };
  }

  @Patch(':id/cancel')
  async cancelAppointment(@Request() req, @Param('id') id: string) {
    const appointment = await this.appointmentService.cancelAppointment(
      req.user.id,
      id,
    );

    return {
      success: true,
      message: 'Appointment cancelled successfully.',
      data: appointment,
    };
  }
}

// ─── Doctor Routes ───────────────────────────────────────────

@Controller('doctor-appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorAppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Get()
  async getDoctorAppointments(@Request() req) {
    const appointments = await this.appointmentService.getDoctorAppointments(
      req.user.id,
    );

    return {
      success: true,
      count: appointments.length,
      data: appointments,
    };
  }
}