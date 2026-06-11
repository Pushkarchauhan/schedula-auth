import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringAvailability } from './recurring-availability.entity';
import { CustomAvailability } from './custom-availability.entity';
import { CreateRecurringAvailabilityDto } from './dto/create-recurring-availability.dto';
import { UpdateRecurringAvailabilityDto } from './dto/update-recurring-availability.dto';
import { CreateCustomAvailabilityDto } from './dto/create-custom-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(RecurringAvailability)
    private readonly recurringRepo: Repository<RecurringAvailability>,

    @InjectRepository(CustomAvailability)
    private readonly customRepo: Repository<CustomAvailability>,
  ) {}

  // ─── Helper: validate time range ─────────────────────────
  private validateTimeRange(startTime: string, endTime: string) {
    if (startTime >= endTime) {
      throw new BadRequestException(
        `Invalid time range: startTime (${startTime}) must be before endTime (${endTime}).`,
      );
    }
  }

  // ─── Helper: check overlapping slots ─────────────────────
  private hasOverlap(
    existing: { startTime: string; endTime: string }[],
    newStart: string,
    newEnd: string,
    excludeId?: string,
  ): boolean {
    return existing.some((slot: any) => {
      if (excludeId && slot.id === excludeId) return false;
      return newStart < slot.endTime && newEnd > slot.startTime;
    });
  }

  // ─── Recurring Availability ───────────────────────────────

  // POST /doctor/availability
  async createRecurring(
    doctorId: string,
    dto: CreateRecurringAvailabilityDto,
  ): Promise<RecurringAvailability> {
    // Validate time range
    this.validateTimeRange(dto.startTime, dto.endTime);

    // Check for overlapping slots on same day
    const existing = await this.recurringRepo.find({
      where: { doctorId, dayOfWeek: dto.dayOfWeek, isActive: true },
    });

    if (this.hasOverlap(existing, dto.startTime, dto.endTime)) {
      throw new BadRequestException(
        `Overlapping time slot detected for ${dto.dayOfWeek}. Please choose a non-overlapping time.`,
      );
    }

    const availability = this.recurringRepo.create({ ...dto, doctorId });
    return this.recurringRepo.save(availability);
  }

  // GET /doctor/availability
  async getRecurring(doctorId: string): Promise<RecurringAvailability[]> {
    const availability = await this.recurringRepo.find({
      where: { doctorId, isActive: true },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });

    if (availability.length === 0) {
      throw new NotFoundException(
        'No recurring availability found. Please add availability via POST /doctor/availability.',
      );
    }

    return availability;
  }

  // PATCH /doctor/availability/:id
  async updateRecurring(
    doctorId: string,
    id: string,
    dto: UpdateRecurringAvailabilityDto,
  ): Promise<RecurringAvailability> {
    const slot = await this.recurringRepo.findOne({ where: { id } });

    if (!slot) {
      throw new NotFoundException(`Availability slot with ID ${id} not found.`);
    }

    // Make sure doctor owns this slot
    if (slot.doctorId !== doctorId) {
      throw new ForbiddenException('You can only update your own availability.');
    }

    const newStart = dto.startTime || slot.startTime;
    const newEnd = dto.endTime || slot.endTime;
    const newDay = dto.dayOfWeek || slot.dayOfWeek;

    // Validate time range
    this.validateTimeRange(newStart, newEnd);

    // Check overlap excluding current slot
    const existing = await this.recurringRepo.find({
      where: { doctorId, dayOfWeek: newDay, isActive: true },
    });

    if (this.hasOverlap(existing, newStart, newEnd, id)) {
      throw new BadRequestException(
        `Overlapping time slot detected for ${newDay}.`,
      );
    }

    Object.assign(slot, dto);
    return this.recurringRepo.save(slot);
  }

  // DELETE /doctor/availability/:id
  async deleteRecurring(doctorId: string, id: string): Promise<void> {
    const slot = await this.recurringRepo.findOne({ where: { id } });

    if (!slot) {
      throw new NotFoundException(`Availability slot with ID ${id} not found.`);
    }

    if (slot.doctorId !== doctorId) {
      throw new ForbiddenException('You can only delete your own availability.');
    }

    await this.recurringRepo.remove(slot);
  }

  // ─── Custom Override ──────────────────────────────────────

  // POST /doctor/availability/override
  async createOverride(
    doctorId: string,
    dto: CreateCustomAvailabilityDto,
  ): Promise<CustomAvailability> {
    // Validate date is not in past
    const today = new Date().toISOString().split('T')[0];
    if (dto.date < today) {
      throw new BadRequestException(
        `Invalid date: ${dto.date} is in the past.`,
      );
    }

    if (!dto.isUnavailable) {
      this.validateTimeRange(dto.startTime, dto.endTime);
    }

    // Check for duplicate override on same date
    const existing = await this.customRepo.find({
      where: { doctorId, date: dto.date },
    });

    if (!dto.isUnavailable && existing.length > 0) {
      if (this.hasOverlap(existing, dto.startTime, dto.endTime)) {
        throw new BadRequestException(
          `Overlapping time slot detected for ${dto.date}.`,
        );
      }
    }

    const override = this.customRepo.create({ ...dto, doctorId });
    return this.customRepo.save(override);
  }

  // GET /doctor/availability/date?date=2026-06-15
  async getByDate(doctorId: string, date: string) {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException(
        'Invalid date format. Use YYYY-MM-DD (e.g. 2026-06-15).',
      );
    }

    // Check custom override first
    const customOverrides = await this.customRepo.find({
      where: { doctorId, date },
    });

    if (customOverrides.length > 0) {
      const isUnavailable = customOverrides.some((o) => o.isUnavailable);
      if (isUnavailable) {
        return {
          date,
          type: 'custom_override',
          isAvailable: false,
          message: 'Doctor is unavailable on this date.',
          slots: [],
        };
      }
      return {
        date,
        type: 'custom_override',
        isAvailable: true,
        slots: customOverrides.map((o) => ({
          startTime: o.startTime,
          endTime: o.endTime,
        })),
      };
    }

    // Fall back to recurring availability
    const dayOfWeek = new Date(date)
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();

    const recurring = await this.recurringRepo.find({
      where: { doctorId, dayOfWeek: dayOfWeek as any, isActive: true },
      order: { startTime: 'ASC' },
    });

    if (recurring.length === 0) {
      return {
        date,
        type: 'recurring',
        isAvailable: false,
        message: `No availability set for ${dayOfWeek}.`,
        slots: [],
      };
    }

    return {
      date,
      type: 'recurring',
      isAvailable: true,
      dayOfWeek,
      slots: recurring.map((r) => ({
        id: r.id,
        startTime: r.startTime,
        endTime: r.endTime,
      })),
    };
  }
}
