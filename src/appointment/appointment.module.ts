import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './appointment.entity';
import { AppointmentService } from './appointment.service';
import { AppointmentController, DoctorAppointmentController } from './appointment.controller';
import { Slot } from '../slots/slot.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Slot, User])],
  providers: [AppointmentService],
  controllers: [AppointmentController, DoctorAppointmentController],
  
})
export class AppointmentModule {}
