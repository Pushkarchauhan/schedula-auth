import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1699999999999 implements MigrationInterface {
  name = 'CreateUsersTable1699999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create role enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_role_enum" AS ENUM('DOCTOR', 'PATIENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"            UUID NOT NULL DEFAULT uuid_generate_v4(),
        "name"          VARCHAR(100) NOT NULL,
        "email"         VARCHAR NOT NULL,
        "password"      VARCHAR NOT NULL,
        "role"          "public"."users_role_enum" NOT NULL,
        "specialization" VARCHAR,
        "licenseNumber" VARCHAR,
        "dateOfBirth"   DATE,
        "bloodGroup"    VARCHAR,
        "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
