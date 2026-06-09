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
  isAvailable: boolean; // Day 4 — availability filter

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
