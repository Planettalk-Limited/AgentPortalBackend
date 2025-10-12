import { MigrationInterface, QueryRunner } from "typeorm";

export class RefinePayoutSystem1760167421270 implements MigrationInterface {
    name = 'RefinePayoutSystem1760167421270'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new reviewMessage column
        await queryRunner.query(`ALTER TABLE "payouts" ADD "reviewMessage" text`);
        
        // Update status enum with data migration
        await queryRunner.query(`ALTER TYPE "public"."payouts_status_enum" RENAME TO "payouts_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."payouts_status_enum" AS ENUM('pending', 'approved', 'review')`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "status" DROP DEFAULT`);
        
        // Map old statuses to new ones (no reject status - all failures become pending for review)
        await queryRunner.query(`
            ALTER TABLE "payouts" 
            ALTER COLUMN "status" TYPE "public"."payouts_status_enum" 
            USING CASE 
                WHEN "status"::text IN ('requested', 'pending_review') THEN 'pending'::payouts_status_enum
                WHEN "status"::text = 'approved' THEN 'approved'::payouts_status_enum
                WHEN "status"::text IN ('rejected', 'cancelled', 'failed') THEN 'pending'::payouts_status_enum
                WHEN "status"::text IN ('processing', 'completed') THEN 'approved'::payouts_status_enum
                ELSE 'pending'::payouts_status_enum
            END
        `);
        
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."payouts_status_enum_old"`);
        
        // Update method enum with data migration
        await queryRunner.query(`ALTER TYPE "public"."payouts_method_enum" RENAME TO "payouts_method_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."payouts_method_enum" AS ENUM('bank_transfer', 'planettalk_credit')`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "method" DROP DEFAULT`);
        
        // Map old methods to new ones
        await queryRunner.query(`
            ALTER TABLE "payouts" 
            ALTER COLUMN "method" TYPE "public"."payouts_method_enum" 
            USING CASE 
                WHEN "method"::text = 'bank_transfer' THEN 'bank_transfer'::payouts_method_enum
                WHEN "method"::text = 'airtime_topup' THEN 'planettalk_credit'::payouts_method_enum
                ELSE 'bank_transfer'::payouts_method_enum
            END
        `);
        
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "method" SET DEFAULT 'bank_transfer'`);
        await queryRunner.query(`DROP TYPE "public"."payouts_method_enum_old"`);
        
        // Resources table updates (unrelated to payout system)
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "fileName" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "originalName" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "mimeType" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "fileSize" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "fileSize" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "mimeType" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "originalName" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "fileName" SET NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."payouts_method_enum_old" AS ENUM('bank_transfer', 'paypal', 'stripe', 'check', 'crypto', 'airtime_topup', 'mobile_money', 'other')`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "method" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "method" TYPE "public"."payouts_method_enum_old" USING "method"::"text"::"public"."payouts_method_enum_old"`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "method" SET DEFAULT 'bank_transfer'`);
        await queryRunner.query(`DROP TYPE "public"."payouts_method_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payouts_method_enum_old" RENAME TO "payouts_method_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."payouts_status_enum_old" AS ENUM('requested', 'pending_review', 'approved', 'processing', 'completed', 'rejected', 'cancelled', 'failed')`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "status" TYPE "public"."payouts_status_enum_old" USING "status"::"text"::"public"."payouts_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "status" SET DEFAULT 'requested'`);
        await queryRunner.query(`DROP TYPE "public"."payouts_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payouts_status_enum_old" RENAME TO "payouts_status_enum"`);
        await queryRunner.query(`ALTER TABLE "payouts" DROP COLUMN "reviewMessage"`);
    }

}
