import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveRejectedStatus1760168885617 implements MigrationInterface {
    name = 'RemoveRejectedStatus1760168885617'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."payouts_status_enum" RENAME TO "payouts_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."payouts_status_enum" AS ENUM('pending', 'approved', 'review')`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "status" TYPE "public"."payouts_status_enum" USING "status"::"text"::"public"."payouts_status_enum"`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."payouts_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payouts_status_enum_old" AS ENUM('pending', 'approved', 'rejected', 'review')`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "status" TYPE "public"."payouts_status_enum_old" USING "status"::"text"::"public"."payouts_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."payouts_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payouts_status_enum_old" RENAME TO "payouts_status_enum"`);
    }

}
