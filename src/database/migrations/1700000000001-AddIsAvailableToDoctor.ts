import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsAvailableToDoctorProfile1700000000001 implements MigrationInterface {
  name = 'AddIsAvailableToDoctorProfile1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ADD COLUMN IF NOT EXISTS "isAvailable" BOOLEAN NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      DROP COLUMN "isAvailable"
    `);
  }
}
