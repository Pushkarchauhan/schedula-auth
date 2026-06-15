import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './appointment.entity';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { Slot, SlotStatus } from '../slots/slot.entity';
import { User, Role } from '../users/user.entity';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(Slot)
    private readonly slotRepo: Repository<Slot>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ─── Book Appointment ─────────────────────────────────────
  // POST /appointment
  async bookAppointment(patientId: string, dto: BookAppointmentDto): Promise<Appointment> {
    const { doctorId, date, startTime, endTime } = dto;

    // Validate date not in past
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      throw new BadRequestException(
        `Cannot book appointment for past date: ${date}.`,
      );
    }

    // Check if today and time not in past
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    if (date === today && startTime <= currentTime) {
      throw new BadRequestException(
        `Cannot book appointment for past time: ${startTime}.`,
      );
    }

    // Check doctor exists
    const doctor = await this.userRepo.findOne({
      where: { id: doctorId, role: Role.DOCTOR },
    });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found.`);
    }

    // Check slot exists
    const slot = await this.slotRepo.findOne({
      where: { doctorId, date, startTime, endTime },
    });
    if (!slot) {
      throw new NotFoundException(
        `Slot not found for ${date} at ${startTime}-${endTime}.`,
      );
    }

    // Check slot is available
    if (slot.status !== SlotStatus.AVAILABLE) {
      throw new BadRequestException(
        `Slot at ${startTime}-${endTime} on ${date} is already booked.`,
      );
    }

    // Check patient doesn't already have appointment at same time
    const existing = await this.appointmentRepo.findOne({
      where: {
        patientId,
        date,
        startTime,
        status: AppointmentStatus.BOOKED,
      },
    });
    if (existing) {
      throw new BadRequestException(
        `You already have an appointment at ${startTime} on ${date}.`,
      );
    }

    // Create appointment
    const appointment = this.appointmentRepo.create({
      patientId,
      doctorId,
      slotId: slot.id,
      date,
      startTime,
      endTime,
      status: AppointmentStatus.BOOKED,
    });

    // Mark slot as booked
    slot.status = SlotStatus.BOOKED;
    await this.slotRepo.save(slot);

    return this.appointmentRepo.save(appointment);
  }

  // ─── Patient View Appointments ────────────────────────────
  // GET /appointment/my
  async getPatientAppointments(patientId: string): Promise<any[]> {
    const appointments = await this.appointmentRepo.find({
      where: { patientId },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    if (appointments.length === 0) {
      throw new NotFoundException('No appointments found.');
    }

    // Get doctor details for each appointment
    const result = await Promise.all(
      appointments.map(async (apt) => {
        const doctor = await this.userRepo.findOne({
          where: { id: apt.doctorId },
        });
        return {
          id: apt.id,
          date: apt.date,
          startTime: apt.startTime,
          endTime: apt.endTime,
          status: apt.status,
          doctor: {
            id: doctor?.id,
            name: doctor?.name,
            specialization: doctor?.specialization,
          },
          createdAt: apt.createdAt,
        };
      }),
    );

    return result;
  }

  // ─── Cancel Appointment ───────────────────────────────────
  // PATCH /appointment/:id/cancel
  async cancelAppointment(patientId: string, id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({ where: { id } });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found.`);
    }

    // Check patient owns this appointment
    if (appointment.patientId !== patientId) {
      throw new ForbiddenException(
        'You can only cancel your own appointments.',
      );
    }

    // Check not already cancelled
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled.');
    }

    // Check not past appointment
    const today = new Date().toISOString().split('T')[0];
    if (appointment.date < today) {
      throw new BadRequestException(
        'Cannot cancel a past appointment.',
      );
    }

    // Cancel appointment
    appointment.status = AppointmentStatus.CANCELLED;
    await this.appointmentRepo.save(appointment);

    // Free up the slot
    const slot = await this.slotRepo.findOne({
      where: { id: appointment.slotId },
    });
    if (slot) {
      slot.status = SlotStatus.AVAILABLE;
      await this.slotRepo.save(slot);
    }

    return appointment;
  }

  // ─── Doctor View Appointments ─────────────────────────────
  // GET /doctor/appointments
  async getDoctorAppointments(doctorId: string): Promise<any[]> {
    const appointments = await this.appointmentRepo.find({
      where: { doctorId },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    if (appointments.length === 0) {
      throw new NotFoundException('No appointments found.');
    }

    // Get patient details for each appointment
    const result = await Promise.all(
      appointments.map(async (apt) => {
        const patient = await this.userRepo.findOne({
          where: { id: apt.patientId },
        });
        return {
          id: apt.id,
          date: apt.date,
          startTime: apt.startTime,
          endTime: apt.endTime,
          status: apt.status,
          patient: {
            id: patient?.id,
            name: patient?.name,
            email: patient?.email,
          },
          createdAt: apt.createdAt,
        };
      }),
    );

    return result;
  }
}
