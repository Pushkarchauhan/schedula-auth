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
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { APPOINTMENT_MESSAGES } from '../common/constants/messages.constants';

// ─── Patient Routes ───────────────────────────────────────────
@Controller('appointment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  // POST /appointment — book appointment
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

  // GET /appointment/my — patient views own appointments
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

  // PATCH /appointment/:id/cancel — cancel appointment
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

  // PATCH /appointment/:id/reschedule — reschedule appointment
  @Patch(':id/reschedule')
  async rescheduleAppointment(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    const appointment = await this.appointmentService.rescheduleAppointment(
      req.user.id,
      id,
      dto,
    );
    return {
      success: true,
      message: APPOINTMENT_MESSAGES.RESCHEDULED,
      data: appointment,
    };
  }
}

// ─── Doctor Routes ────────────────────────────────────────────
@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorAppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  // GET /doctor/appointments — doctor views own appointments
  @Get('appointments')
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
