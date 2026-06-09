import { PartialType } from '@nestjs/mapped-types';
import { CreateDoctorProfileDto } from './create-doctor-profile.dto';

// All fields become optional automatically
export class UpdateDoctorProfileDto extends PartialType(CreateDoctorProfileDto) {}
