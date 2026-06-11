import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';
import { DayOfWeek } from '../recurring-availability.entity';

export class CreateRecurringAvailabilityDto {
  @IsNotEmpty()
  @IsEnum(DayOfWeek, {
    message: 'dayOfWeek must be MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY or SUNDAY',
  })
  dayOfWeek: DayOfWeek;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:MM format (e.g. 10:00)',
  })
  startTime: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:MM format (e.g. 13:00)',
  })
  endTime: string;
}
