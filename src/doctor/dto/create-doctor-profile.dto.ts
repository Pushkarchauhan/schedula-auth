import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SchedulingType } from '../doctor-profile.entity';

export class CreateDoctorProfileDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsString()
  specialization: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experience: number;

  @IsNotEmpty()
  @IsString()
  qualification: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consultationFee: number;

  @IsOptional()
  @IsString()
  availabilityHours?: string;

  @IsOptional()
  @IsString()
  profileDetails?: string;

  @IsOptional()
  @IsEnum(SchedulingType)
  schedulingType?: SchedulingType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  slotDuration?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bufferTime?: number;

  @ValidateIf((o) => o.schedulingType === SchedulingType.WAVE)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPatientsPerWave?: number;
}
