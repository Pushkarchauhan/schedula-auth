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
import { APPOINTMENT_MESSAGES, DOCTOR_MESSAGES } from '../common/constants/messages.constants';

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
  async bookAppointment(patientId: string, dto: BookAppointmentDto): Promise<Appointment> {
    const { doctorId, date, startTime, endTime } = dto;

    // Validate future date
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.PAST_DATE(date));
    }

    // Validate future time if today
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    if (date === today && startTime <= currentTime) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.PAST_TIME(startTime));
    }

    // Check doctor exists
    const doctor = await this.userRepo.findOne({
      where: { id: doctorId, role: Role.DOCTOR },
    });
    if (!doctor) {
      throw new NotFoundException(DOCTOR_MESSAGES.DOCTOR_NOT_FOUND(doctorId));
    }

    // Check slot exists
    const slot = await this.slotRepo.findOne({
      where: { doctorId, date, startTime, endTime },
    });
    if (!slot) {
      throw new NotFoundException(APPOINTMENT_MESSAGES.SLOT_NOT_FOUND(date, startTime, endTime));
    }

    // Check slot available
    if (slot.status !== SlotStatus.AVAILABLE) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.SLOT_ALREADY_BOOKED(startTime, endTime, date));
    }

    // Check duplicate booking
    const existing = await this.appointmentRepo.findOne({
      where: { patientId, date, startTime, status: AppointmentStatus.BOOKED },
    });
    if (existing) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.DUPLICATE(startTime, date));
    }

    // Create appointment and mark slot booked
    const appointment = this.appointmentRepo.create({
      patientId,
      doctorId,
      slotId: slot.id,
      date,
      startTime,
      endTime,
      status: AppointmentStatus.BOOKED,
    });

    slot.status = SlotStatus.BOOKED;
    await this.slotRepo.save(slot);

    return this.appointmentRepo.save(appointment);
  }

  // ─── Patient View Appointments ────────────────────────────
  async getPatientAppointments(patientId: string): Promise<any> {
    const appointments = await this.appointmentRepo.find({
      where: { patientId },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    // ✅ Return empty array instead of 404
    if (appointments.length === 0) {
      return { message: APPOINTMENT_MESSAGES.NO_APPOINTMENTS, data: [] };
    }

    const data = await Promise.all(
      appointments.map(async (apt) => {
        const doctor = await this.userRepo.findOne({ where: { id: apt.doctorId } });
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

    return { data };
  }

  // ─── Cancel Appointment ───────────────────────────────────
  async cancelAppointment(patientId: string, id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({ where: { id } });

    if (!appointment) {
      throw new NotFoundException(APPOINTMENT_MESSAGES.NOT_FOUND(id));
    }

    if (appointment.patientId !== patientId) {
      throw new ForbiddenException(APPOINTMENT_MESSAGES.UNAUTHORIZED);
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.ALREADY_CANCELLED);
    }

    const today = new Date().toISOString().split('T')[0];
    if (appointment.date < today) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.CANNOT_CANCEL_PAST);
    }

    appointment.status = AppointmentStatus.CANCELLED;
    await this.appointmentRepo.save(appointment);

    // Free up slot
    const slot = await this.slotRepo.findOne({ where: { id: appointment.slotId } });
    if (slot) {
      slot.status = SlotStatus.AVAILABLE;
      await this.slotRepo.save(slot);
    }

    return appointment;
  }

  // ─── Doctor View Appointments ─────────────────────────────
  async getDoctorAppointments(doctorId: string): Promise<any> {
    const appointments = await this.appointmentRepo.find({
      where: { doctorId },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    // ✅ Return empty array instead of 404
    if (appointments.length === 0) {
      return { message: APPOINTMENT_MESSAGES.NO_APPOINTMENTS, data: [] };
    }

    const data = await Promise.all(
      appointments.map(async (apt) => {
        const patient = await this.userRepo.findOne({ where: { id: apt.patientId } });
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

    return { data };
  }
}
