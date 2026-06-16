import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Slot } from './slot.entity';
import { SlotsService } from './slots.service';
import {
  DoctorSlotsController,
  DoctorWavesController,
  PatientSlotsController,
} from './slots.controller';
import { RecurringAvailability } from '../availability/recurring-availability.entity';
import { CustomAvailability } from '../availability/custom-availability.entity';
import { User } from '../users/user.entity';
import { DoctorProfile } from '../doctor/doctor-profile.entity';
import { WaveSchedule } from './wave-schedule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Slot,
      RecurringAvailability,
      CustomAvailability,
      User,
      DoctorProfile,
      WaveSchedule,
    ]),
  ],
  providers: [SlotsService],
  controllers: [DoctorSlotsController, DoctorWavesController, PatientSlotsController],
})
export class SlotsModule {}
