import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Slot, SlotStatus } from './slot.entity';
import { SlotType } from './slot.entity';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { RecurringAvailability } from '../availability/recurring-availability.entity';
import { CustomAvailability } from '../availability/custom-availability.entity';
import { User } from '../users/user.entity';
import { Role } from '../users/user.entity';
import { DoctorProfile, SchedulingType } from '../doctor/doctor-profile.entity';
import { WaveSchedule } from './wave-schedule.entity';
import { CreateWaveDto } from './dto/create-wave.dto';

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

    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepo: Repository<DoctorProfile>,

    @InjectRepository(WaveSchedule)
    private readonly waveRepo: Repository<WaveSchedule>,
  ) {}

  // ─── Helper: generate time slots from a window ────────────
  private generateTimeSlots(
    startTime: string,
    endTime: string,
    duration: number,
    bufferTime = 0,
  ): { startTime: string; endTime: string }[] {
    const slots = [];
    let current = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    while (current + duration <= end) {
      slots.push({
        startTime: this.minutesToTime(current),
        endTime: this.minutesToTime(current + duration),
      });
      current += duration + bufferTime;
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

  private hasOverlappingRanges(
    ranges: { startTime: string; endTime: string }[],
  ): boolean {
    const sorted = [...ranges].sort((a, b) =>
      this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime),
    );
    for (let i = 1; i < sorted.length; i += 1) {
      const prevEnd = this.timeToMinutes(sorted[i - 1].endTime);
      const currentStart = this.timeToMinutes(sorted[i].startTime);
      if (currentStart < prevEnd) {
        return true;
      }
    }
    return false;
  }

  // ─── Generate Slots (Doctor Only) ────────────────────────
  // POST /doctor/slots/generate
  async generateSlots(doctorId: string, dto: GenerateSlotsDto): Promise<Slot[]> {
    const { date } = dto;

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

    const doctorProfile = await this.doctorProfileRepo.findOne({
      where: { userId: doctorId },
    });
    if (!doctorProfile) {
      throw new NotFoundException(
        'Doctor profile not found. Please complete onboarding via POST /doctor/profile.',
      );
    }

    const schedulingType =
      dto.schedulingType ?? doctorProfile.schedulingType ?? SchedulingType.STREAM;

    if (
      schedulingType !== SchedulingType.STREAM &&
      schedulingType !== SchedulingType.WAVE
    ) {
      throw new BadRequestException('Invalid scheduling type. Use STREAM or WAVE.');
    }

    const duration = dto.duration ?? doctorProfile.slotDuration;
    const bufferTime = dto.bufferTime ?? doctorProfile.bufferTime ?? 0;
    const maxPatientsPerWave =
      dto.maxPatientsPerWave ?? doctorProfile.maxPatientsPerWave;

    if (duration < 5) {
      throw new BadRequestException('Invalid slot duration. Must be at least 5 minutes.');
    }

    if (bufferTime < 0) {
      throw new BadRequestException('Invalid buffer time. Cannot be negative.');
    }

    if (schedulingType === SchedulingType.WAVE && !maxPatientsPerWave) {
      throw new BadRequestException(
        'Invalid capacity. maxPatientsPerWave must be configured for WAVE scheduling.',
      );
    }

    // Get availability windows
    const windows = await this.getAvailabilityWindows(doctorId, date);
    if (windows.length === 0) {
      throw new NotFoundException(
        `No availability found for ${date}. Please set availability first.`,
      );
    }
    if (this.hasOverlappingRanges(windows)) {
      throw new BadRequestException(
        `Conflicting schedule for ${date}: overlapping availability windows.`,
      );
    }

    // Generate slots from all windows
    const slotsToCreate: Slot[] = [];
    for (const window of windows) {
      if (schedulingType === SchedulingType.WAVE) {
        const start = this.timeToMinutes(window.startTime);
        const end = this.timeToMinutes(window.endTime);
        if (end <= start) {
          throw new BadRequestException(
            `Conflicting schedule for ${date}: endTime must be after startTime.`,
          );
        }

        slotsToCreate.push(
          this.slotRepo.create({
            doctorId,
            date,
            startTime: window.startTime,
            endTime: window.endTime,
            duration: end - start,
            slotType: SlotType.WAVE,
            capacity: maxPatientsPerWave,
            bookedCount: 0,
            status: SlotStatus.AVAILABLE,
          }),
        );
      } else {
        const timeSlots = this.generateTimeSlots(
          window.startTime,
          window.endTime,
          duration,
          bufferTime,
        );

        for (const slot of timeSlots) {
          const newSlot = this.slotRepo.create({
            doctorId,
            date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            duration,
            slotType: SlotType.STREAM,
            capacity: 1,
            bookedCount: 0,
            status: SlotStatus.AVAILABLE,
          });
          slotsToCreate.push(newSlot);
        }
      }
    }

    if (slotsToCreate.length === 0) {
      throw new BadRequestException(
        schedulingType === SchedulingType.WAVE
          ? 'No waves could be generated from the configured availability windows.'
          : `No slots could be generated. The availability window is too small for ${duration} min slots.`,
      );
    }

    return this.slotRepo.save(slotsToCreate);
  }

  async createWave(doctorId: string, dto: CreateWaveDto): Promise<WaveSchedule> {
    const { date, capacity } = dto;
    this.validateDate(date);

    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      throw new BadRequestException(`Invalid date: ${date} is in the past.`);
    }
    if (capacity < 1) {
      throw new BadRequestException('Invalid capacity. Must be at least 1.');
    }

    const windows = await this.getAvailabilityWindows(doctorId, date);
    if (windows.length === 0) {
      throw new NotFoundException(`No availability found for ${date}. Please set availability first.`);
    }

    const startTime = dto.startTime ?? windows[0].startTime;
    const endTime = dto.endTime ?? windows[0].endTime;
    if (!startTime || !endTime) {
      throw new BadRequestException('startTime and endTime are required when availability window is missing.');
    }
    if (this.timeToMinutes(endTime) <= this.timeToMinutes(startTime)) {
      throw new BadRequestException('Conflicting schedule: endTime must be after startTime.');
    }

    const inAvailabilityWindow = windows.some(
      (window) =>
        this.timeToMinutes(startTime) >= this.timeToMinutes(window.startTime) &&
        this.timeToMinutes(endTime) <= this.timeToMinutes(window.endTime),
    );
    if (!inAvailabilityWindow) {
      throw new BadRequestException('Wave time must be inside doctor availability window.');
    }

    const overlap = await this.slotRepo
      .createQueryBuilder('slot')
      .where('slot.doctor_id = :doctorId', { doctorId })
      .andWhere('slot.date = :date', { date })
      .andWhere('slot.slotType = :slotType', { slotType: SlotType.WAVE })
      .andWhere('slot.startTime < :endTime', { endTime })
      .andWhere('slot.endTime > :startTime', { startTime })
      .getOne();
    if (overlap) {
      throw new BadRequestException('Overlapping wave exists for this time range.');
    }

    const slot = await this.slotRepo.save(
      this.slotRepo.create({
        doctorId,
        date,
        startTime,
        endTime,
        duration: this.timeToMinutes(endTime) - this.timeToMinutes(startTime),
        slotType: SlotType.WAVE,
        capacity,
        bookedCount: 0,
        status: SlotStatus.AVAILABLE,
      }),
    );

    return this.waveRepo.save(
      this.waveRepo.create({
        doctorId,
        slotId: slot.id,
        date,
        startTime,
        endTime,
        capacity,
        bookedCount: 0,
      }),
    );
  }

  async getDoctorWaves(doctorId: string, date: string): Promise<WaveSchedule[]> {
    this.validateDate(date);
    return this.waveRepo.find({
      where: { doctorId, date },
      order: { startTime: 'ASC' },
    });
  }

  async getAvailableWaves(doctorId: string, date: string): Promise<any> {
    this.validateDate(date);
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      throw new BadRequestException(`Cannot view waves for past date: ${date}.`);
    }

    const doctor = await this.userRepo.findOne({
      where: { id: doctorId, role: Role.DOCTOR },
    });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found.`);
    }

    const waves = await this.waveRepo.find({
      where: { doctorId, date },
      order: { startTime: 'ASC' },
    });

    const rows = await Promise.all(
      waves.map(async (wave) => {
        const slot = await this.slotRepo.findOne({ where: { id: wave.slotId } });
        const bookedCount = slot?.bookedCount ?? wave.bookedCount;
        return {
          waveId: wave.id,
          slotId: wave.slotId,
          timeWindow: `${wave.startTime} - ${wave.endTime}`,
          available: Math.max(0, wave.capacity - bookedCount),
          capacity: wave.capacity,
        };
      }),
    );

    return {
      doctorId,
      doctorName: doctor.name,
      date,
      waves: rows,
    };
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

    const streamSlots = slots.filter((slot) => slot.slotType === SlotType.STREAM);
    const waveSlots = slots.filter((slot) => slot.slotType === SlotType.WAVE);

    return {
      doctorId,
      doctorName: doctor.name,
      date,
      totalSlots: slots.length,
      stream: streamSlots.map((s) => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        status: s.status,
      })),
      wave: waveSlots.map((s) => ({
        id: s.id,
        timeWindow: `${s.startTime} - ${s.endTime}`,
        available: s.capacity - s.bookedCount,
        capacity: s.capacity,
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
