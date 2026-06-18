import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DoctorModule } from './doctor/doctor.module';
import { PatientModule } from './patient/patient.module';
import { User } from './users/user.entity';
import { DoctorProfile } from './doctor/doctor-profile.entity';
import { PatientProfile } from './patient/patient-profile.entity';

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
            type: 'postgres' as const,
            url: databaseUrl,
            entities: [User, DoctorProfile, PatientProfile],
            synchronize: false,
            migrations: ['dist/database/migrations/*.js'],
            migrationsRun: true,
            ssl: {
              rejectUnauthorized: false,
            },
            logging: false,
          };
        }

        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'postgres'),
          database: config.get<string>('DB_NAME', 'schedula'),
          entities: [User, DoctorProfile, PatientProfile],
          synchronize: false,
          migrations: ['dist/database/migrations/*.js'],
          migrationsRun: true,
          logging: false,
        };
      },
    }),

    AuthModule,
    UsersModule,
    DoctorModule,
    PatientModule,
  ],
})
export class AppModule {}