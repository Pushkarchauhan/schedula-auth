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
import { SlotType } from '../slots/slot.entity';
import { User, Role } from '../users/user.entity';
import { APPOINTMENT_MESSAGES, DOCTOR_MESSAGES } from '../common/constants/messages.constants';
import { WaveSchedule } from '../slots/wave-schedule.entity';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(Slot)
    private readonly slotRepo: Repository<Slot>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(WaveSchedule)
    private readonly waveRepo: Repository<WaveSchedule>,
  ) {}

  // ─── Book Appointment ─────────────────────────────────────
  async bookAppointment(patientId: string, dto: BookAppointmentDto): Promise<Appointment> {
    const { doctorId, date, startTime, endTime, slotId } = dto;

    // Validate future date
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.PAST_DATE(date));
    }

    // Validate future time if today for stream booking
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    if (date === today && startTime && startTime <= currentTime) {
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
    const slot = slotId
      ? await this.slotRepo.findOne({
          where: { id: slotId, doctorId, date },
        })
      : await this.slotRepo.findOne({
          where: { doctorId, date, startTime, endTime },
        });
    if (!slot) {
      throw new NotFoundException(
        APPOINTMENT_MESSAGES.SLOT_NOT_FOUND(date, startTime ?? 'NA', endTime ?? 'NA'),
      );
    }

    let tokenNumber: number | null = null;

    if (slot.slotType === SlotType.WAVE) {
      // Check duplicate booking in the same wave
      const duplicateWaveBooking = await this.appointmentRepo.findOne({
        where: { patientId, slotId: slot.id, status: AppointmentStatus.BOOKED },
      });
      if (duplicateWaveBooking) {
        throw new BadRequestException('Duplicate booking not allowed for the same wave.');
      }

      if (slot.bookedCount >= slot.capacity) {
        slot.status = SlotStatus.BOOKED;
        await this.slotRepo.save(slot);
        throw new BadRequestException('Wave is full.');
      }

      tokenNumber = slot.bookedCount + 1;
      slot.bookedCount += 1;
      if (slot.bookedCount >= slot.capacity) {
        slot.status = SlotStatus.BOOKED;
      }
    } else {
      // Check slot available
      if (slot.status !== SlotStatus.AVAILABLE) {
        throw new BadRequestException(
          APPOINTMENT_MESSAGES.SLOT_ALREADY_BOOKED(slot.startTime, slot.endTime, date),
        );
      }

      // Check duplicate booking
      const existing = await this.appointmentRepo.findOne({
        where: {
          patientId,
          date,
          startTime: slot.startTime,
          status: AppointmentStatus.BOOKED,
        },
      });
      if (existing) {
        throw new BadRequestException(APPOINTMENT_MESSAGES.DUPLICATE(slot.startTime, date));
      }

      slot.bookedCount = 1;
      slot.status = SlotStatus.BOOKED;
    }

    // Create appointment and mark slot booked
    const appointment = this.appointmentRepo.create({
      patientId,
      doctorId,
      slotId: slot.id,
      date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      tokenNumber,
      status: AppointmentStatus.BOOKED,
    });

    await this.slotRepo.save(slot);

    if (slot.slotType === SlotType.WAVE) {
      const wave = await this.waveRepo.findOne({ where: { slotId: slot.id } });
      if (wave) {
        wave.bookedCount = slot.bookedCount;
        await this.waveRepo.save(wave);
      }
    }

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
          tokenNumber: apt.tokenNumber,
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
      if (slot.slotType === SlotType.WAVE) {
        slot.bookedCount = Math.max(0, slot.bookedCount - 1);
        slot.status = SlotStatus.AVAILABLE;
      } else {
        slot.bookedCount = 0;
        slot.status = SlotStatus.AVAILABLE;
      }
      await this.slotRepo.save(slot);

      if (slot.slotType === SlotType.WAVE) {
        const wave = await this.waveRepo.findOne({ where: { slotId: slot.id } });
        if (wave) {
          wave.bookedCount = slot.bookedCount;
          await this.waveRepo.save(wave);
        }
      }
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
          tokenNumber: apt.tokenNumber,
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
