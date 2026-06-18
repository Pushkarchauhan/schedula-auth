import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProfileTables1700000000000 implements MigrationInterface {
  name = 'CreateProfileTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."patient_profiles_gender_enum"
          AS ENUM('MALE', 'FEMALE', 'OTHER');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

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
        "createdAt"         TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"         TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_doctor_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_doctor_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_doctor_profiles_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

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
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."patient_profiles_gender_enum"`);
  }
}
