import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppointmentsTable1700000000004 implements MigrationInterface {
  name = 'CreateAppointmentsTable1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create appointment status enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."appointments_status_enum"
          AS ENUM('BOOKED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create appointments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "appointments" (
        "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "patient_id"  UUID NOT NULL,
        "doctor_id"   UUID NOT NULL,
        "slot_id"     UUID NOT NULL,
        "date"        DATE NOT NULL,
        "startTime"   TIME NOT NULL,
        "endTime"     TIME NOT NULL,
        "status"      "public"."appointments_status_enum" NOT NULL DEFAULT 'BOOKED',
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_appointments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_appointments_patient"
          FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_appointments_doctor"
          FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_appointments_slot"
          FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."appointments_status_enum"`);
  }
}
