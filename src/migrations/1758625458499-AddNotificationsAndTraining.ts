import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationsAndTraining1758625458499 implements MigrationInterface {
    name = 'AddNotificationsAndTraining1758625458499'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "training_completions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "trainingMaterialId" uuid NOT NULL, "completedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "timeSpentMinutes" integer, "score" double precision, "attempts" integer, "notes" text, "metadata" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_b0fea996c839737c5d7ae6303c4" UNIQUE ("userId", "trainingMaterialId"), CONSTRAINT "PK_da32ce9ca24ffdb1a055695fcb1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a8bd1bafd8bf8d0492813d7df4" ON "training_completions" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_44a3221693b2c2e6c968238373" ON "training_completions" ("trainingMaterialId") `);
        await queryRunner.query(`CREATE INDEX "IDX_0a8a1090a4c8e4dc3636e8967c" ON "training_completions" ("completedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_b0fea996c839737c5d7ae6303c" ON "training_completions" ("userId", "trainingMaterialId") `);
        await queryRunner.query(`CREATE TYPE "public"."training_materials_type_enum" AS ENUM('onboarding', 'compliance', 'product', 'sales', 'policy', 'checklist')`);
        await queryRunner.query(`CREATE TYPE "public"."training_materials_status_enum" AS ENUM('draft', 'published', 'archived')`);
        await queryRunner.query(`CREATE TABLE "training_materials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text NOT NULL, "type" "public"."training_materials_type_enum" NOT NULL DEFAULT 'onboarding', "status" "public"."training_materials_status_enum" NOT NULL DEFAULT 'draft', "content" text, "videoUrl" character varying, "documentUrl" character varying, "attachments" text, "required" boolean NOT NULL DEFAULT false, "order" integer NOT NULL DEFAULT '0', "estimatedMinutes" integer, "tags" text, "metadata" jsonb, "prerequisiteIds" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9c5f58bee5ce1af3378a5d3e671" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_036fb5968b9741f463be9e5bb4" ON "training_materials" ("required", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_faa560205d50d4eda4cc9fe6de" ON "training_materials" ("type", "status") `);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('announcement', 'training', 'earnings', 'payout', 'application', 'system')`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL DEFAULT 'system', "priority" "public"."notifications_priority_enum" NOT NULL DEFAULT 'medium', "title" character varying NOT NULL, "message" text NOT NULL, "metadata" jsonb, "actionUrl" character varying, "actionText" character varying, "read" boolean NOT NULL DEFAULT false, "readAt" TIMESTAMP WITH TIME ZONE, "expiresAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_692a909ee0fa9383e7859f9b40" ON "notifications" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_741cfeddaf765d752513d3e2fb" ON "notifications" ("priority", "readAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_fd14f67af04f17d8d7a6356168" ON "notifications" ("type", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_eb224d6d3acf40220d84a63720" ON "notifications" ("userId", "readAt") `);
        await queryRunner.query(`ALTER TABLE "training_completions" ADD CONSTRAINT "FK_a8bd1bafd8bf8d0492813d7df40" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "training_completions" ADD CONSTRAINT "FK_44a3221693b2c2e6c9682383734" FOREIGN KEY ("trainingMaterialId") REFERENCES "training_materials"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`);
        await queryRunner.query(`ALTER TABLE "training_completions" DROP CONSTRAINT "FK_44a3221693b2c2e6c9682383734"`);
        await queryRunner.query(`ALTER TABLE "training_completions" DROP CONSTRAINT "FK_a8bd1bafd8bf8d0492813d7df40"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eb224d6d3acf40220d84a63720"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fd14f67af04f17d8d7a6356168"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_741cfeddaf765d752513d3e2fb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_692a909ee0fa9383e7859f9b40"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_faa560205d50d4eda4cc9fe6de"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_036fb5968b9741f463be9e5bb4"`);
        await queryRunner.query(`DROP TABLE "training_materials"`);
        await queryRunner.query(`DROP TYPE "public"."training_materials_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."training_materials_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b0fea996c839737c5d7ae6303c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0a8a1090a4c8e4dc3636e8967c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_44a3221693b2c2e6c968238373"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a8bd1bafd8bf8d0492813d7df4"`);
        await queryRunner.query(`DROP TABLE "training_completions"`);
    }

}
