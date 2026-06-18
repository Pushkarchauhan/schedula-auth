import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DoctorModule } from './doctor/doctor.module';
import { PatientModule } from './patient/patient.module';
import { AvailabilityModule } from './availability/availability.module';
import { SlotsModule } from './slots/slots.module';
import { AppointmentModule } from './appointment/appointment.module';
import { User } from './users/user.entity';
import { DoctorProfile } from './doctor/doctor-profile.entity';
import { PatientProfile } from './patient/patient-profile.entity';
import { RecurringAvailability } from './availability/recurring-availability.entity';
import { CustomAvailability } from './availability/custom-availability.entity';
import { Slot } from './slots/slot.entity';
import { Appointment } from './appointment/appointment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [
              User,
              DoctorProfile,
              PatientProfile,
              RecurringAvailability,
              CustomAvailability,
              Slot,
              Appointment,
            ],
            synchronize: false,        // ✅ disabled — use migrations only
            migrations: ['dist/database/migrations/*.js'],
            migrationsRun: true,       // ✅ auto run on startup
            ssl: { rejectUnauthorized: false },
            logging: false,
          };
        }
        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'postgres'),
          database: config.get<string>('DB_NAME', 'schedula'),
          entities: [
            User,
            DoctorProfile,
            PatientProfile,
            RecurringAvailability,
            CustomAvailability,
            Slot,
            Appointment,
          ],
          synchronize: false,          // ✅ disabled — use migrations only
          migrations: ['dist/database/migrations/*.js'],
          migrationsRun: true,         // ✅ auto run on startup
          logging: false,
        };
      },
    }),
    AuthModule,
    UsersModule,
    DoctorModule,
    PatientModule,
    AvailabilityModule,
    SlotsModule,
    AppointmentModule,
  ],
})
export class AppModule {}
