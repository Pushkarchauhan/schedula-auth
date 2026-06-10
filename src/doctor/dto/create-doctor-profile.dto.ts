import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

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
}
