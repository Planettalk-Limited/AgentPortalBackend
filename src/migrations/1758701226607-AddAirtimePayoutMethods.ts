import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAirtimePayoutMethods1758701226607 implements MigrationInterface {
    name = 'AddAirtimePayoutMethods1758701226607'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."payouts_method_enum" RENAME TO "payouts_method_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."payouts_method_enum" AS ENUM('bank_transfer', 'paypal', 'stripe', 'check', 'crypto', 'airtime_topup', 'mobile_money', 'other')`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "method" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "method" TYPE "public"."payouts_method_enum" USING "method"::"text"::"public"."payouts_method_enum"`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "method" SET DEFAULT 'bank_transfer'`);
        await queryRunner.query(`DROP TYPE "public"."payouts_method_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payouts_method_enum_old" AS ENUM('bank_transfer', 'paypal', 'stripe', 'check', 'crypto', 'other')`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "method" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "method" TYPE "public"."payouts_method_enum_old" USING "method"::"text"::"public"."payouts_method_enum_old"`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "method" SET DEFAULT 'bank_transfer'`);
        await queryRunner.query(`DROP TYPE "public"."payouts_method_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payouts_method_enum_old" RENAME TO "payouts_method_enum"`);
    }

}
