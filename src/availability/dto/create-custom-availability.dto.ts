import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CreateCustomAvailabilityDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format (e.g. 2026-06-15)',
  })
  date: string;

  @IsOptional()
  @IsBoolean()
  isUnavailable?: boolean;

  @ValidateIf((o) => !o.isUnavailable)
  @IsNotEmpty({ message: 'startTime is required when isUnavailable is false' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:MM format (e.g. 14:00)',
  })
  startTime?: string;

  @ValidateIf((o) => !o.isUnavailable)
  @IsNotEmpty({ message: 'endTime is required when isUnavailable is false' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:MM format (e.g. 17:00)',
  })
  endTime?: string;
}
