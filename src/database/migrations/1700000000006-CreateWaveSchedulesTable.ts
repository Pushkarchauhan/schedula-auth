import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWaveSchedulesTable1700000000006 implements MigrationInterface {
  name = 'CreateWaveSchedulesTable1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wave_schedules" (
        "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id"   UUID NOT NULL,
        "slot_id"     UUID NOT NULL,
        "date"        DATE NOT NULL,
        "startTime"   TIME NOT NULL,
        "endTime"     TIME NOT NULL,
        "capacity"    INTEGER NOT NULL,
        "bookedCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wave_schedules" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wave_schedules_slot_id" UNIQUE ("slot_id"),
        CONSTRAINT "FK_wave_schedules_doctor"
          FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_wave_schedules_slot"
          FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "wave_schedules"`);
  }
}
