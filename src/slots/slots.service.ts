import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Slot, SlotStatus } from './slot.entity';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { RecurringAvailability } from '../availability/recurring-availability.entity';
import { CustomAvailability } from '../availability/custom-availability.entity';
import { User } from '../users/user.entity';
import { Role } from '../users/user.entity';

@Injectable()
export class SlotsService {
  constructor(
    @InjectRepository(Slot)
    private readonly slotRepo: Repository<Slot>,

    @InjectRepository(RecurringAvailability)
    private readonly recurringRepo: Repository<RecurringAvailability>,

    @InjectRepository(CustomAvailability)
    private readonly customRepo: Repository<CustomAvailability>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ─── Helper: generate time slots from a window ────────────
  private generateTimeSlots(
    startTime: string,
    endTime: string,
    duration: number,
  ): { startTime: string; endTime: string }[] {
    const slots = [];
    let current = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    while (current + duration <= end) {
      slots.push({
        startTime: this.minutesToTime(current),
        endTime: this.minutesToTime(current + duration),
      });
      current += duration;
    }

    return slots;
  }

  // ─── Helper: convert time string to minutes ───────────────
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // ─── Helper: convert minutes to time string ───────────────
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // ─── Helper: get day of week from date ────────────────────
  private getDayOfWeek(date: string): string {
    return new Date(date)
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();
  }

  // ─── Generate Slots (Doctor Only) ────────────────────────
  // POST /doctor/slots/generate
  async generateSlots(doctorId: string, dto: GenerateSlotsDto): Promise<Slot[]> {
    const { date, duration } = dto;

    // Validate date not in past
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      throw new BadRequestException(
        `Invalid date: ${date} is in the past.`,
      );
    }

    // Check if slots already generated for this date
    const existing = await this.slotRepo.find({
      where: { doctorId, date },
    });
    if (existing.length > 0) {
      throw new BadRequestException(
        `Slots already generated for ${date}. Delete existing slots first.`,
      );
    }

    // Get availability windows
    const windows = await this.getAvailabilityWindows(doctorId, date);
    if (windows.length === 0) {
      throw new NotFoundException(
        `No availability found for ${date}. Please set availability first.`,
      );
    }

    // Generate slots from all windows
    const slotsToCreate: Slot[] = [];
    for (const window of windows) {
      const timeSlots = this.generateTimeSlots(
        window.startTime,
        window.endTime,
        duration,
      );

      for (const slot of timeSlots) {
        const newSlot = this.slotRepo.create({
          doctorId,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration,
          status: SlotStatus.AVAILABLE,
        });
        slotsToCreate.push(newSlot);
      }
    }

    if (slotsToCreate.length === 0) {
      throw new BadRequestException(
        `No slots could be generated. The availability window is too small for ${duration} min slots.`,
      );
    }

    return this.slotRepo.save(slotsToCreate);
  }

  // ─── Get Availability Windows ─────────────────────────────
  private async getAvailabilityWindows(
    doctorId: string,
    date: string,
  ): Promise<{ startTime: string; endTime: string }[]> {
    // Check custom override first
    const customOverrides = await this.customRepo.find({
      where: { doctorId, date },
    });

    if (customOverrides.length > 0) {
      // Doctor marked as unavailable
      if (customOverrides.some((o) => o.isUnavailable)) {
        return [];
      }
      return customOverrides.map((o) => ({
        startTime: o.startTime,
        endTime: o.endTime,
      }));
    }

    // Fall back to recurring availability
    const dayOfWeek = this.getDayOfWeek(date);
    const recurring = await this.recurringRepo.find({
      where: { doctorId, dayOfWeek: dayOfWeek as any, isActive: true },
    });

    return recurring.map((r) => ({
      startTime: r.startTime,
      endTime: r.endTime,
    }));
  }

  // ─── Get Doctor Slots (Doctor view) ───────────────────────
  // GET /doctor/slots?date=2026-06-20
  async getDoctorSlots(doctorId: string, date: string): Promise<Slot[]> {
    this.validateDate(date);

    const slots = await this.slotRepo.find({
      where: { doctorId, date },
      order: { startTime: 'ASC' },
    });

    if (slots.length === 0) {
      throw new NotFoundException(
        `No slots found for ${date}. Generate slots via POST /doctor/slots/generate.`,
      );
    }

    return slots;
  }

  // ─── Get Available Slots (Patient view) ───────────────────
  // GET /doctor/:doctorId/slots?date=2026-06-20
  async getAvailableSlots(doctorId: string, date: string, duration?: number): Promise<any> {
    this.validateDate(date);

    // Validate date not in past
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      throw new BadRequestException(
        `Cannot view slots for past date: ${date}.`,
      );
    }

    // Check doctor exists
    const doctor = await this.userRepo.findOne({
      where: { id: doctorId, role: Role.DOCTOR },
    });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found.`);
    }

    // Get all available slots
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const isToday = date === today;

    let slots = await this.slotRepo.find({
      where: { doctorId, date, status: SlotStatus.AVAILABLE },
      order: { startTime: 'ASC' },
    });

    // Filter past slots if today
    if (isToday) {
      slots = slots.filter((slot) => slot.startTime > currentTime);
    }

    // Filter by duration if provided
    if (duration) {
      slots = slots.filter((slot) => slot.duration === duration);
    }

    if (slots.length === 0) {
      return {
        doctorId,
        date,
        message: 'No available slots found for this date.',
        slots: [],
      };
    }

    return {
      doctorId,
      doctorName: doctor.name,
      date,
      totalSlots: slots.length,
      slots: slots.map((s) => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        status: s.status,
      })),
    };
  }

  // ─── Helper: validate date format ─────────────────────────
  private validateDate(date: string) {
    if (!date) {
      throw new BadRequestException(
        'Please provide a date. e.g. ?date=2026-06-20',
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException(
        'Invalid date format. Use YYYY-MM-DD (e.g. 2026-06-20).',
      );
    }
  }
}
