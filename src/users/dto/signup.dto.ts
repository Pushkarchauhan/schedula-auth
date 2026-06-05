import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '../user.entity';

export class SignupDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsEnum(Role, { message: 'Role must be DOCTOR or PATIENT' })
  role: Role;

  // Required only for DOCTOR
  @ValidateIf((o) => o.role === Role.DOCTOR)
  @IsNotEmpty({ message: 'Specialization is required for doctors' })
  @IsString()
  specialization?: string;

  @ValidateIf((o) => o.role === Role.DOCTOR)
  @IsNotEmpty({ message: 'License number is required for doctors' })
  @IsString()
  licenseNumber?: string;

  // Optional for PATIENT
  @ValidateIf((o) => o.role === Role.PATIENT)
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ValidateIf((o) => o.role === Role.PATIENT)
  @IsOptional()
  @IsString()
  bloodGroup?: string;
}
