import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role } from './user.entity';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: SignupDto): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered. Please log in.');
    }

    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role,
      ...(dto.role === Role.DOCTOR && {
        specialization: dto.specialization,
        licenseNumber: dto.licenseNumber,
      }),
      ...(dto.role === Role.PATIENT && {
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        bloodGroup: dto.bloodGroup,
      }),
    });

    return this.userRepo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    // Include password for auth comparison
    return this.userRepo.findOne({
      where: { email },
      select: ['id', 'name', 'email', 'password', 'role', 'specialization', 'licenseNumber', 'dateOfBirth', 'bloodGroup', 'createdAt'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findAllByRole(role: Role): Promise<User[]> {
    return this.userRepo.find({ where: { role } });
  }
}
