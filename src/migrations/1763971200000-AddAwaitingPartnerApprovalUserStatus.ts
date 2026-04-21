import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAwaitingPartnerApprovalUserStatus1763971200000
  implements MigrationInterface
{
  name = 'AddAwaitingPartnerApprovalUserStatus1763971200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_status_enum" ADD VALUE 'awaiting_partner_approval'`,
    );
  }

  public async down(): Promise<void> {
    // Removing a PostgreSQL enum value is non-trivial; map rows then recreate type if rollback is required.
  }
}
