import { Body, Controller, Get, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from '../users/dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/signup — creates account, NO token returned
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    const result = await this.authService.signup(dto);
    return {
      success: true,
      ...result,
    };
  }

  // POST /api/auth/login — returns JWT token
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return {
      success: true,
      message: 'Logged in successfully.',
      ...result,
    };
  }

  // GET /api/auth/me  (any authenticated user)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req) {
    return {
      success: true,
      ...this.authService.getMe(req.user),
    };
  }
}
