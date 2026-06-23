import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SchedulingType } from '../../doctor/doctor-profile.entity';

export class GenerateSlotsDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  duration?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bufferTime?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPatientsPerWave?: number;

  @IsOptional()
  @IsEnum(SchedulingType)
  schedulingType?: SchedulingType;
}
