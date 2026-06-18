import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './appointment.entity';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { RescheduleUnavailableException } from './exceptions/reschedule-unavailable.exception';
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

    private readonly dataSource: DataSource,
  ) {}

  private static readonly RESCHEDULE_CUTOFF_MINUTES = 30;

  /** Normalize DB/user time ("10:00" or "10:00:00") to HH:MM:SS. */
  private normalizeTime(time: string): string {
    const [hours = '0', minutes = '0', seconds = '0'] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
  }

  /** Build a local datetime from date + time (timezone-safe for comparisons). */
  private getAppointmentDateTime(date: string, startTime: string): Date {
    const [year, month, day] = date.split('-').map(Number);
    const normalized = this.normalizeTime(startTime);
    const [hours, minutes, seconds] = normalized.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }

  private getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isFutureAppointment(date: string, startTime: string): boolean {
    return this.getAppointmentDateTime(date, startTime) > new Date();
  }

  private isPastOrSameAppointment(date: string, startTime: string): boolean {
    return this.getAppointmentDateTime(date, startTime) <= new Date();
  }

  private timeToMinutes(time: string): number {
    const normalized = this.normalizeTime(time);
    const [hours, minutes] = normalized.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private isWithinRescheduleCutoff(date: string, startTime: string): boolean {
    const appointmentStart = this.getAppointmentDateTime(date, startTime);
    const cutoff = new Date(
      appointmentStart.getTime() -
        AppointmentService.RESCHEDULE_CUTOFF_MINUTES * 60 * 1000,
    );
    return new Date() >= cutoff;
  }

  private async releaseSlot(slot: Slot): Promise<void> {
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

  private async findNextAvailableStreamSlot(
    doctorId: string,
    date: string,
    afterStartTime?: string,
  ): Promise<Record<string, unknown> | null> {
    const slots = await this.slotRepo.find({
      where: {
        doctorId,
        date,
        slotType: SlotType.STREAM,
        status: SlotStatus.AVAILABLE,
      },
      order: { startTime: 'ASC' },
    });

    for (const slot of slots) {
      if (afterStartTime && this.timeToMinutes(slot.startTime) <= this.timeToMinutes(afterStartTime)) {
        continue;
      }
      if (!this.isFutureAppointment(slot.date, slot.startTime)) {
        continue;
      }
      return {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotId: slot.id,
      };
    }
    return null;
  }

  private async findNextAvailableWave(
    doctorId: string,
    date: string,
    afterStartTime?: string,
  ): Promise<Record<string, unknown> | null> {
    const waves = await this.waveRepo.find({
      where: { doctorId, date },
      order: { startTime: 'ASC' },
    });

    const today = this.getTodayDateString();

    for (const wave of waves) {
      if (afterStartTime && this.timeToMinutes(wave.startTime) <= this.timeToMinutes(afterStartTime)) {
        continue;
      }
      if (!this.isFutureAppointment(wave.date, wave.startTime)) {
        continue;
      }
      const slot = await this.slotRepo.findOne({ where: { id: wave.slotId } });
      const bookedCount = slot?.bookedCount ?? wave.bookedCount;
      if (bookedCount < wave.capacity) {
        return {
          date: wave.date,
          startTime: wave.startTime,
          endTime: wave.endTime,
          slotId: wave.slotId,
          available: wave.capacity - bookedCount,
          capacity: wave.capacity,
        };
      }
    }
    return null;
  }

  private isSameAppointment(
    current: Appointment,
    date: string,
    slotId: string,
    startTime: string,
    endTime: string,
  ): boolean {
    return (
      current.date === date &&
      current.slotId === slotId &&
      current.startTime === startTime &&
      current.endTime === endTime
    );
  }

  // ─── Book Appointment ─────────────────────────────────────
  async bookAppointment(patientId: string, dto: BookAppointmentDto): Promise<Appointment> {
    const { doctorId, date, startTime, endTime, slotId } = dto;

    const today = this.getTodayDateString();
    if (date < today) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.PAST_DATE(date));
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

    // Validate full datetime (date + slot.startTime), not time alone
    if (this.isPastOrSameAppointment(date, slot.startTime)) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.PAST_TIME(slot.startTime));
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

  // ─── Reschedule Appointment ─────────────────────────────────
  async rescheduleAppointment(
    patientId: string,
    appointmentId: string,
    dto: RescheduleAppointmentDto,
  ): Promise<Appointment> {
    const { date, startTime, endTime, slotId } = dto;

    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException(APPOINTMENT_MESSAGES.NOT_FOUND(appointmentId));
    }

    if (appointment.patientId !== patientId) {
      throw new ForbiddenException(APPOINTMENT_MESSAGES.UNAUTHORIZED_RESCHEDULE);
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.ALREADY_CANCELLED);
    }

    const today = this.getTodayDateString();
    if (appointment.date < today) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.PAST_APPOINTMENT);
    }

    if (this.isWithinRescheduleCutoff(appointment.date, appointment.startTime)) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.CUTOFF_RESCHEDULE_CANCEL);
    }

    if (date < today) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.PAST_DATE(date));
    }

    const doctor = await this.userRepo.findOne({
      where: { id: appointment.doctorId, role: Role.DOCTOR },
    });
    if (!doctor) {
      throw new NotFoundException(DOCTOR_MESSAGES.DOCTOR_NOT_FOUND(appointment.doctorId));
    }

    const newSlot = slotId
      ? await this.slotRepo.findOne({
          where: { id: slotId, doctorId: appointment.doctorId, date },
        })
      : await this.slotRepo.findOne({
          where: {
            doctorId: appointment.doctorId,
            date,
            startTime,
            endTime,
          },
        });

    if (!newSlot) {
      throw new NotFoundException(
        APPOINTMENT_MESSAGES.SLOT_NOT_FOUND(date, startTime ?? 'NA', endTime ?? 'NA'),
      );
    }

    if (
      this.isSameAppointment(
        appointment,
        date,
        newSlot.id,
        newSlot.startTime,
        newSlot.endTime,
      )
    ) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.SAME_SLOT);
    }

    if (!this.isFutureAppointment(date, newSlot.startTime)) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.PAST_TIME(newSlot.startTime));
    }

    if (newSlot.slotType !== SlotType.STREAM && newSlot.slotType !== SlotType.WAVE) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.INVALID_SCHEDULING_TYPE);
    }

    if (newSlot.slotType === SlotType.STREAM) {
      if (newSlot.status !== SlotStatus.AVAILABLE || newSlot.bookedCount >= 1) {
        const suggestedSlot = await this.findNextAvailableStreamSlot(
          appointment.doctorId,
          date,
          newSlot.startTime,
        );
        throw new RescheduleUnavailableException(
          APPOINTMENT_MESSAGES.SLOT_UNAVAILABLE,
          suggestedSlot ? { suggestedSlot } : {},
        );
      }
    } else {
      if (newSlot.bookedCount >= newSlot.capacity) {
        const suggestedWave = await this.findNextAvailableWave(
          appointment.doctorId,
          date,
          newSlot.startTime,
        );
        throw new RescheduleUnavailableException(
          APPOINTMENT_MESSAGES.WAVE_UNAVAILABLE,
          suggestedWave ? { suggestedWave } : {},
        );
      }

      const duplicateInWave = await this.appointmentRepo.findOne({
        where: {
          patientId,
          slotId: newSlot.id,
          status: AppointmentStatus.BOOKED,
        },
      });
      if (duplicateInWave) {
        throw new BadRequestException('Duplicate booking not allowed for the same wave.');
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const lockedNewSlot = await manager.findOne(Slot, {
        where: { id: newSlot.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedNewSlot) {
        throw new NotFoundException(APPOINTMENT_MESSAGES.SLOT_NOT_FOUND(date, startTime ?? 'NA', endTime ?? 'NA'));
      }

      const lockedAppointment = await manager.findOne(Appointment, {
        where: { id: appointmentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedAppointment || lockedAppointment.status === AppointmentStatus.CANCELLED) {
        throw new BadRequestException(APPOINTMENT_MESSAGES.ALREADY_CANCELLED);
      }

      const lockedOldSlot = await manager.findOne(Slot, {
        where: { id: lockedAppointment.slotId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedOldSlot) {
        throw new NotFoundException('Current appointment slot not found.');
      }

      let tokenNumber: number | null = null;

      if (lockedNewSlot.slotType === SlotType.STREAM) {
        if (
          lockedNewSlot.status !== SlotStatus.AVAILABLE ||
          lockedNewSlot.bookedCount >= 1
        ) {
          const suggestedSlot = await this.findNextAvailableStreamSlot(
            appointment.doctorId,
            date,
            lockedNewSlot.startTime,
          );
          throw new RescheduleUnavailableException(
            APPOINTMENT_MESSAGES.SLOT_UNAVAILABLE,
            suggestedSlot ? { suggestedSlot } : {},
          );
        }
        lockedNewSlot.bookedCount = 1;
        lockedNewSlot.status = SlotStatus.BOOKED;
        tokenNumber = null;
      } else {
        if (lockedNewSlot.bookedCount >= lockedNewSlot.capacity) {
          const suggestedWave = await this.findNextAvailableWave(
            appointment.doctorId,
            date,
            lockedNewSlot.startTime,
          );
          throw new RescheduleUnavailableException(
            APPOINTMENT_MESSAGES.WAVE_UNAVAILABLE,
            suggestedWave ? { suggestedWave } : {},
          );
        }
        tokenNumber = lockedNewSlot.bookedCount + 1;
        lockedNewSlot.bookedCount += 1;
        if (lockedNewSlot.bookedCount >= lockedNewSlot.capacity) {
          lockedNewSlot.status = SlotStatus.BOOKED;
        }
      }

      if (lockedOldSlot.slotType === SlotType.WAVE) {
        lockedOldSlot.bookedCount = Math.max(0, lockedOldSlot.bookedCount - 1);
        lockedOldSlot.status = SlotStatus.AVAILABLE;
      } else {
        lockedOldSlot.bookedCount = 0;
        lockedOldSlot.status = SlotStatus.AVAILABLE;
      }

      await manager.save(lockedOldSlot);
      await manager.save(lockedNewSlot);

      if (lockedOldSlot.slotType === SlotType.WAVE) {
        const oldWave = await manager.findOne(WaveSchedule, {
          where: { slotId: lockedOldSlot.id },
        });
        if (oldWave) {
          oldWave.bookedCount = lockedOldSlot.bookedCount;
          await manager.save(oldWave);
        }
      }

      if (lockedNewSlot.slotType === SlotType.WAVE) {
        const newWave = await manager.findOne(WaveSchedule, {
          where: { slotId: lockedNewSlot.id },
        });
        if (newWave) {
          newWave.bookedCount = lockedNewSlot.bookedCount;
          await manager.save(newWave);
        }
      }

      lockedAppointment.date = date;
      lockedAppointment.slotId = lockedNewSlot.id;
      lockedAppointment.startTime = lockedNewSlot.startTime;
      lockedAppointment.endTime = lockedNewSlot.endTime;
      lockedAppointment.tokenNumber = tokenNumber;

      return manager.save(lockedAppointment);
    });
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

    const today = this.getTodayDateString();
    if (appointment.date < today) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.CANNOT_CANCEL_PAST);
    }

    if (this.isWithinRescheduleCutoff(appointment.date, appointment.startTime)) {
      throw new BadRequestException(APPOINTMENT_MESSAGES.CUTOFF_RESCHEDULE_CANCEL);
    }

    appointment.status = AppointmentStatus.CANCELLED;
    await this.appointmentRepo.save(appointment);

    const slot = await this.slotRepo.findOne({ where: { id: appointment.slotId } });
    if (slot) {
      await this.releaseSlot(slot);
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
