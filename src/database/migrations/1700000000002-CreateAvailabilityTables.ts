import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAvailabilityTables1700000000002 implements MigrationInterface {
  name = 'CreateAvailabilityTables1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create day of week enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."recurring_availability_dayofweek_enum"
          AS ENUM('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create recurring_availability table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recurring_availability" (
        "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id"   UUID NOT NULL,
        "dayOfWeek"   "public"."recurring_availability_dayofweek_enum" NOT NULL,
        "startTime"   TIME NOT NULL,
        "endTime"     TIME NOT NULL,
        "isActive"    BOOLEAN NOT NULL DEFAULT true,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recurring_availability" PRIMARY KEY ("id"),
        CONSTRAINT "FK_recurring_availability_doctor"
          FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create custom_availability table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "custom_availability" (
        "id"              UUID NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id"       UUID NOT NULL,
        "date"            DATE NOT NULL,
        "startTime"       TIME,
        "endTime"         TIME,
        "isUnavailable"   BOOLEAN NOT NULL DEFAULT false,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_custom_availability" PRIMARY KEY ("id"),
        CONSTRAINT "FK_custom_availability_doctor"
          FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_availability"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recurring_availability"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."recurring_availability_dayofweek_enum"`);
  }
}
