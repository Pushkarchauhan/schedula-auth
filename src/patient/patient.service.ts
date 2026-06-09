import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientProfile } from './patient-profile.entity';
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(PatientProfile)
    private readonly patientProfileRepo: Repository<PatientProfile>,
  ) {}

  // POST /patient/profile
  async createProfile(userId: string, dto: CreatePatientProfileDto): Promise<PatientProfile> {
    // Prevent duplicate profile
    const existing = await this.patientProfileRepo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException(
        'Patient profile already exists. Use PATCH /patient/profile to update it.',
      );
    }

    const profile = this.patientProfileRepo.create({ ...dto, userId });
    return this.patientProfileRepo.save(profile);
  }

  // GET /patient/profile
  async getProfile(userId: string): Promise<PatientProfile> {
    const profile = await this.patientProfileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(
        'Patient profile not found. Please complete onboarding via POST /patient/profile.',
      );
    }
    return profile;
  }

  // PATCH /patient/profile
  async updateProfile(userId: string, dto: UpdatePatientProfileDto): Promise<PatientProfile> {
    const profile = await this.patientProfileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(
        'Patient profile not found. Please create it first via POST /patient/profile.',
      );
    }

    Object.assign(profile, dto);
    return this.patientProfileRepo.save(profile);
  }
}
