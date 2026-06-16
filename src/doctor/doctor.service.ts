import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { DoctorProfile } from './doctor-profile.entity';
import { SchedulingType } from './doctor-profile.entity';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { DoctorQueryDto } from './dto/doctor-query.dto';
import { SetSchedulingTypeDto } from './dto/set-scheduling-type.dto';

@Injectable()
export class DoctorService {
  private validateSchedulingConfig(dto: CreateDoctorProfileDto | UpdateDoctorProfileDto) {
    if (
      dto.slotDuration !== undefined &&
      !Number.isInteger(dto.slotDuration)
    ) {
      throw new BadRequestException('slotDuration must be an integer.');
    }

    if (dto.slotDuration !== undefined && dto.slotDuration <= 0) {
      throw new BadRequestException('slotDuration must be greater than 0.');
    }

    if (dto.bufferTime !== undefined && dto.bufferTime < 0) {
      throw new BadRequestException('bufferTime cannot be negative.');
    }

    if (
      dto.schedulingType === SchedulingType.WAVE &&
      (!dto.maxPatientsPerWave || dto.maxPatientsPerWave < 1)
    ) {
      throw new BadRequestException(
        'maxPatientsPerWave is required and must be at least 1 for WAVE scheduling.',
      );
    }
  }

  constructor(
    @InjectRepository(DoctorProfile)
    private readonly doctorProfileRepo: Repository<DoctorProfile>,
  ) {}

  // ─── Onboarding (Day 3) ──────────────────────────────────

  async createProfile(userId: string, dto: CreateDoctorProfileDto): Promise<DoctorProfile> {
    this.validateSchedulingConfig(dto);
    const existing = await this.doctorProfileRepo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException(
        'Doctor profile already exists. Use PATCH /doctor/profile to update it.',
      );
    }
    const profile = this.doctorProfileRepo.create({ ...dto, userId });
    return this.doctorProfileRepo.save(profile);
  }

  async getProfile(userId: string): Promise<DoctorProfile> {
    const profile = await this.doctorProfileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(
        'Doctor profile not found. Please complete onboarding via POST /doctor/profile.',
      );
    }
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateDoctorProfileDto): Promise<DoctorProfile> {
    const profile = await this.doctorProfileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(
        'Doctor profile not found. Please create it first via POST /doctor/profile.',
      );
    }
    const merged = {
      schedulingType: dto.schedulingType ?? profile.schedulingType,
      slotDuration: dto.slotDuration ?? profile.slotDuration,
      bufferTime: dto.bufferTime ?? profile.bufferTime,
      maxPatientsPerWave: dto.maxPatientsPerWave ?? profile.maxPatientsPerWave,
    };
    this.validateSchedulingConfig(merged as any);
    Object.assign(profile, dto);
    return this.doctorProfileRepo.save(profile);
  }

  async setSchedulingType(userId: string, dto: SetSchedulingTypeDto): Promise<DoctorProfile> {
    const profile = await this.doctorProfileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(
        'Doctor profile not found. Please create it first via POST /doctor/profile.',
      );
    }

    const merged = {
      schedulingType: dto.schedulingType,
      slotDuration: dto.slotDuration ?? profile.slotDuration,
      bufferTime: dto.bufferTime ?? profile.bufferTime,
      maxPatientsPerWave: dto.maxPatientsPerWave ?? profile.maxPatientsPerWave,
    };
    this.validateSchedulingConfig(merged as any);

    profile.schedulingType = merged.schedulingType;
    profile.slotDuration = merged.slotDuration;
    profile.bufferTime = merged.bufferTime;
    profile.maxPatientsPerWave = merged.maxPatientsPerWave ?? null;
    return this.doctorProfileRepo.save(profile);
  }

  // ─── Discovery (Day 4) ───────────────────────────────────

  // GET /doctor — list with filters, search, pagination
  async findAll(query: DoctorQueryDto) {
    const {
      specialization,
      search,
      availability,
      page = 1,
      limit = 10,
    } = query;

    // Validate pagination values
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be positive numbers.');
    }

    const where: any = {};

    // Filter by specialization (case-insensitive)
    if (specialization) {
      where.specialization = ILike(`%${specialization}%`);
    }

    // Filter by name search (partial match)
    if (search) {
      where.fullName = ILike(`%${search}%`);
    }

    // Filter by availability
    if (availability !== undefined) {
      where.isAvailable = availability;
    }

    const [doctors, total] = await this.doctorProfileRepo.findAndCount({
      where,
      select: [
        'id',
        'fullName',
        'specialization',
        'experience',
        'consultationFee',
        'availabilityHours',
        'isAvailable',
      ],
      skip: (page - 1) * limit,
      take: limit,
      order: { fullName: 'ASC' },
    });

    if (doctors.length === 0) {
      return {
        message: 'No doctors found matching your criteria.',
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    return {
      data: doctors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // GET /doctor/:id — get doctor details by ID
  async findById(id: string): Promise<DoctorProfile> {
    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException('Invalid doctor ID format.');
    }

    const doctor = await this.doctorProfileRepo.findOne({ where: { id } });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found.`);
    }
    return doctor;
  }
}
