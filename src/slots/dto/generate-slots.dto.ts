import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsIn,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateSlotsDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsIn([10, 15, 30, 45, 60], {
    message: 'duration must be 10, 15, 30, 45 or 60 minutes',
  })
  duration: number;
}
