import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSlotsTable1700000000003 implements MigrationInterface {
  name = 'CreateSlotsTable1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create slot status enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."slots_status_enum"
          AS ENUM('AVAILABLE', 'BOOKED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create slots table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "slots" (
        "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id"   UUID NOT NULL,
        "date"        DATE NOT NULL,
        "startTime"   TIME NOT NULL,
        "endTime"     TIME NOT NULL,
        "duration"    INTEGER NOT NULL,
        "status"      "public"."slots_status_enum" NOT NULL DEFAULT 'AVAILABLE',
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_slots" PRIMARY KEY ("id"),
        CONSTRAINT "FK_slots_doctor"
          FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "slots"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."slots_status_enum"`);
  }
}
