import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMetadataColumns1758536948640 implements MigrationInterface {
    name = 'AddMetadataColumns1758536948640'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payouts_status_enum" AS ENUM('requested', 'pending_review', 'approved', 'processing', 'completed', 'rejected', 'cancelled', 'failed')`);
        await queryRunner.query(`CREATE TYPE "public"."payouts_method_enum" AS ENUM('bank_transfer', 'paypal', 'stripe', 'check', 'crypto', 'other')`);
        await queryRunner.query(`CREATE TABLE "payouts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."payouts_status_enum" NOT NULL DEFAULT 'requested', "method" "public"."payouts_method_enum" NOT NULL DEFAULT 'bank_transfer', "amount" numeric(15,2) NOT NULL, "fees" numeric(15,2) NOT NULL DEFAULT '0', "netAmount" numeric(15,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'USD', "description" text, "paymentDetails" json, "transactionId" character varying(100), "adminNotes" text, "rejectionReason" text, "requestedAt" TIMESTAMP NOT NULL, "approvedAt" TIMESTAMP, "processedAt" TIMESTAMP, "completedAt" TIMESTAMP, "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "agentId" uuid NOT NULL, "processedBy" uuid, CONSTRAINT "PK_76855dc4f0a6c18c72eea302e87" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_03db09c32473c5427c1a0a62ad" ON "payouts" ("processedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_28e5666bfebe5155f5dd8c9dfb" ON "payouts" ("requestedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_3f32ee6d2385d9a8bc0cc92af5" ON "payouts" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_ad25e70ca1fd1c86e2ad5edcbb" ON "payouts" ("agentId") `);
        await queryRunner.query(`ALTER TABLE "referral_usages" ADD "usedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD "metadata" json`);
        await queryRunner.query(`ALTER TABLE "payouts" ADD CONSTRAINT "FK_ad25e70ca1fd1c86e2ad5edcbbf" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payouts" ADD CONSTRAINT "FK_47a116118f7657536a570bd38e0" FOREIGN KEY ("processedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payouts" DROP CONSTRAINT "FK_47a116118f7657536a570bd38e0"`);
        await queryRunner.query(`ALTER TABLE "payouts" DROP CONSTRAINT "FK_ad25e70ca1fd1c86e2ad5edcbbf"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "metadata"`);
        await queryRunner.query(`ALTER TABLE "referral_usages" DROP COLUMN "usedAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ad25e70ca1fd1c86e2ad5edcbb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3f32ee6d2385d9a8bc0cc92af5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_28e5666bfebe5155f5dd8c9dfb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_03db09c32473c5427c1a0a62ad"`);
        await queryRunner.query(`DROP TABLE "payouts"`);
        await queryRunner.query(`DROP TYPE "public"."payouts_method_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payouts_status_enum"`);
    }

}
