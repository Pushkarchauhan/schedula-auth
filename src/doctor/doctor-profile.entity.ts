import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum SchedulingType {
  STREAM = 'STREAM',
  WAVE = 'WAVE',
}

@Entity('doctor_profiles')
export class DoctorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  fullName: string;

  @Column({ type: 'varchar', length: 100 })
  specialization: string;

  @Column({ type: 'int' })
  experience: number;

  @Column({ type: 'varchar', length: 200 })
  qualification: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  consultationFee: number;

  @Column({ type: 'varchar', length: 300, nullable: true })
  availabilityHours: string;

  @Column({ type: 'text', nullable: true })
  profileDetails: string;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({
    type: 'enum',
    enum: SchedulingType,
    default: SchedulingType.STREAM,
  })
  schedulingType: SchedulingType;

  @Column({ type: 'int', default: 15 })
  slotDuration: number;

  @Column({ type: 'int', default: 0 })
  bufferTime: number;

  @Column({ type: 'int', nullable: true })
  maxPatientsPerWave: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
