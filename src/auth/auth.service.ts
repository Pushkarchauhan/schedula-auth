import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SignupDto } from '../users/dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const user = await this.usersService.create(dto);
    const token = this.generateToken(user);
    return { token, user: this.sanitize(user) };
  }

  async login(dto: LoginDto) {
    // Find user with password included
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials. No account found with this email.');
    }

    const isMatch = await user.comparePassword(dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials. Incorrect password.');
    }

    const token = this.generateToken(user);
    return { token, user: this.sanitize(user) };
  }

  getMe(user: User) {
    return { user: this.sanitize(user) };
  }

  private generateToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private sanitize(user: User) {
    const { password, ...rest } = user as any;
    return rest;
  }
}
