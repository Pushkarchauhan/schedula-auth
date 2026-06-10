import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from '../patient-profile.entity';

export class CreatePatientProfileDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(150)
  age: number;

  @IsNotEmpty()
  @IsEnum(Gender, { message: 'Gender must be MALE, FEMALE or OTHER' })
  gender: Gender;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;
}
