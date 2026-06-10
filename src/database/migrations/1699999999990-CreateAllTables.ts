import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAllTables1699999999990 implements MigrationInterface {
  name = 'CreateAllTables1699999999990';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid extension
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );

    // Create role enum for users
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_role_enum" AS ENUM('DOCTOR', 'PATIENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create gender enum for patients
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."patient_profiles_gender_enum" AS ENUM('MALE', 'FEMALE', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Step 1 — Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"             UUID NOT NULL DEFAULT uuid_generate_v4(),
        "name"           VARCHAR(100) NOT NULL,
        "email"          VARCHAR NOT NULL,
        "password"       VARCHAR NOT NULL,
        "role"           "public"."users_role_enum" NOT NULL,
        "specialization" VARCHAR,
        "licenseNumber"  VARCHAR,
        "dateOfBirth"    DATE,
        "bloodGroup"     VARCHAR,
        "createdAt"      TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    // Step 2 — Create doctor_profiles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "doctor_profiles" (
        "id"                UUID NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"           UUID NOT NULL,
        "fullName"          VARCHAR(100) NOT NULL,
        "specialization"    VARCHAR(100) NOT NULL,
        "experience"        INTEGER NOT NULL,
        "qualification"     VARCHAR(200) NOT NULL,
        "consultationFee"   NUMERIC(10,2) NOT NULL,
        "availabilityHours" VARCHAR(300),
        "profileDetails"    TEXT,
        "isAvailable"       BOOLEAN NOT NULL DEFAULT true,
        "createdAt"         TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"         TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_doctor_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_doctor_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_doctor_profiles_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Step 3 — Create patient_profiles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patient_profiles" (
        "id"               UUID NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"          UUID NOT NULL,
        "fullName"         VARCHAR(100) NOT NULL,
        "age"              INTEGER NOT NULL,
        "gender"           "public"."patient_profiles_gender_enum" NOT NULL,
        "phone"            VARCHAR(20) NOT NULL,
        "address"          VARCHAR(300),
        "bloodGroup"       VARCHAR,
        "allergies"        TEXT,
        "medicalHistory"   TEXT,
        "emergencyContact" VARCHAR,
        "createdAt"        TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"        TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_patient_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_patient_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_patient_profiles_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "patient_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."patient_profiles_gender_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
  }
}