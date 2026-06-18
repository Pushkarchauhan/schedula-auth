import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdvancedScheduling1700000000005 implements MigrationInterface {
  name = 'AddAdvancedScheduling1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."doctor_profiles_schedulingtype_enum"
          AS ENUM('STREAM', 'WAVE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ADD COLUMN IF NOT EXISTS "schedulingType"
      "public"."doctor_profiles_schedulingtype_enum" NOT NULL DEFAULT 'STREAM'
    `);
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ADD COLUMN IF NOT EXISTS "slotDuration" INTEGER NOT NULL DEFAULT 15
    `);
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ADD COLUMN IF NOT EXISTS "bufferTime" INTEGER NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ADD COLUMN IF NOT EXISTS "maxPatientsPerWave" INTEGER
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."slots_slottype_enum"
          AS ENUM('STREAM', 'WAVE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "slots"
      ADD COLUMN IF NOT EXISTS "slotType"
      "public"."slots_slottype_enum" NOT NULL DEFAULT 'STREAM'
    `);
    await queryRunner.query(`
      ALTER TABLE "slots"
      ADD COLUMN IF NOT EXISTS "capacity" INTEGER NOT NULL DEFAULT 1
    `);
    await queryRunner.query(`
      ALTER TABLE "slots"
      ADD COLUMN IF NOT EXISTS "bookedCount" INTEGER NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "appointments"
      ADD COLUMN IF NOT EXISTS "tokenNumber" INTEGER
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "tokenNumber"`);

    await queryRunner.query(`ALTER TABLE "slots" DROP COLUMN IF EXISTS "bookedCount"`);
    await queryRunner.query(`ALTER TABLE "slots" DROP COLUMN IF EXISTS "capacity"`);
    await queryRunner.query(`ALTER TABLE "slots" DROP COLUMN IF EXISTS "slotType"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."slots_slottype_enum"`);

    await queryRunner.query(`ALTER TABLE "doctor_profiles" DROP COLUMN IF EXISTS "maxPatientsPerWave"`);
    await queryRunner.query(`ALTER TABLE "doctor_profiles" DROP COLUMN IF EXISTS "bufferTime"`);
    await queryRunner.query(`ALTER TABLE "doctor_profiles" DROP COLUMN IF EXISTS "slotDuration"`);
    await queryRunner.query(`ALTER TABLE "doctor_profiles" DROP COLUMN IF EXISTS "schedulingType"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."doctor_profiles_schedulingtype_enum"`);
  }
}
