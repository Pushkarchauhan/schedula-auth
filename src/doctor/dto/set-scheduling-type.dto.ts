import { IsEnum, IsInt, IsOptional, Min, ValidateIf } from 'class-validator';
import { SchedulingType } from '../doctor-profile.entity';

export class SetSchedulingTypeDto {
  @IsEnum(SchedulingType)
  schedulingType: SchedulingType;

  @ValidateIf((o) => o.schedulingType === SchedulingType.STREAM)
  @IsInt()
  @Min(5)
  slotDuration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferTime?: number;

  @ValidateIf((o) => o.schedulingType === SchedulingType.WAVE)
  @IsInt()
  @Min(1)
  maxPatientsPerWave?: number;
}
