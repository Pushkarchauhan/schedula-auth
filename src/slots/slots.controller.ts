import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/user.entity';
import { SlotsService } from './slots.service';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { CreateWaveDto } from './dto/create-wave.dto';

// ─── Doctor Routes ────────────────────────────────────────────
@Controller('doctor/slots')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorSlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  // POST /doctor/slots/generate — generate slots from availability
  @Post('generate')
  async generateSlots(@Request() req, @Body() dto: GenerateSlotsDto) {
    const slots = await this.slotsService.generateSlots(req.user.id, dto);
    return {
      success: true,
      message: `${slots.length} slots generated successfully.`,
      data: slots,
    };
  }

  // GET /doctor/slots?date=2026-06-20 — view own slots
  @Get()
  async getDoctorSlots(@Request() req, @Query('date') date: string) {
    const slots = await this.slotsService.getDoctorSlots(req.user.id, date);
    return {
      success: true,
      count: slots.length,
      data: slots,
    };
  }

}

@Controller('doctor/waves')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorWavesController {
  constructor(private readonly slotsService: SlotsService) {}

  // POST /doctor/waves
  @Post()
  async createWave(@Request() req, @Body() dto: CreateWaveDto) {
    const wave = await this.slotsService.createWave(req.user.id, dto);
    return {
      success: true,
      message: 'Wave schedule created successfully.',
      data: wave,
    };
  }

  // GET /doctor/waves?date=YYYY-MM-DD
  @Get()
  async getDoctorWaves(@Request() req, @Query('date') date: string) {
    const waves = await this.slotsService.getDoctorWaves(req.user.id, date);
    return {
      success: true,
      count: waves.length,
      data: waves,
    };
  }
}

// ─── Patient Routes (Public) ──────────────────────────────────
@Controller('doctor')
export class PatientSlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  // GET /doctor/:doctorId/slots?date=2026-06-20
  @Get(':doctorId/slots')
  async getAvailableSlots(
    @Param('doctorId') doctorId: string,
    @Query('date') date: string,
    @Query('duration') duration: number,
  ) {
    const result = await this.slotsService.getAvailableSlots(
      doctorId,
      date,
      duration,
    );
    return { success: true, data: result };
  }

  // GET /doctor/:doctorId/waves?date=YYYY-MM-DD
  @Get(':doctorId/waves')
  async getAvailableWaves(
    @Param('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    const result = await this.slotsService.getAvailableWaves(doctorId, date);
    return { success: true, data: result };
  }
}
