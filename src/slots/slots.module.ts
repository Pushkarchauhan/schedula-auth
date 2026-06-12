import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Slot } from './slot.entity';
import { SlotsService } from './slots.service';
import { DoctorSlotsController, PatientSlotsController } from './slots.controller';
import { RecurringAvailability } from '../availability/recurring-availability.entity';
import { CustomAvailability } from '../availability/custom-availability.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Slot,
      RecurringAvailability,
      CustomAvailability,
      User,
    ]),
  ],
  providers: [SlotsService],
  controllers: [DoctorSlotsController, PatientSlotsController],
})
export class SlotsModule {}
