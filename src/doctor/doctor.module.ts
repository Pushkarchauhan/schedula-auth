import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorProfile } from './doctor-profile.entity';
import { DoctorService } from './doctor.service';
import { DoctorController, DoctorPublicController } from './doctor.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorProfile])],
  providers: [DoctorService],
  controllers: [DoctorPublicController, DoctorController],
})
export class DoctorModule {}
