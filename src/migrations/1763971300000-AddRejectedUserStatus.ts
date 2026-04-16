import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectedUserStatus1763971300000 implements MigrationInterface {
  name = 'AddRejectedUserStatus1763971300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_status_enum" ADD VALUE IF NOT EXISTS 'rejected'`,
    );
  }

  public async down(): Promise<void> {
    // Removing a PostgreSQL enum value is non-trivial; map rows then recreate type if rollback is required.
  }
}
