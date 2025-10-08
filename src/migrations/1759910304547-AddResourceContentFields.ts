import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResourceContentFields1759910304547 implements MigrationInterface {
    name = 'AddResourceContentFields1759910304547'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "resources" ADD "externalUrl" text`);
        await queryRunner.query(`ALTER TABLE "resources" ADD "embeddedContent" text`);
        await queryRunner.query(`ALTER TABLE "resources" ADD "isEmbedded" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "resources" ADD "isExternal" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TYPE "public"."resources_category_enum" RENAME TO "resources_category_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."resources_category_enum" AS ENUM('training', 'marketing', 'compliance', 'announcement', 'policy', 'guide', 'template', 'bank_forms', 'terms_conditions', 'media', 'other')`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "category" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "category" TYPE "public"."resources_category_enum" USING "category"::"text"::"public"."resources_category_enum"`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "category" SET DEFAULT 'other'`);
        await queryRunner.query(`DROP TYPE "public"."resources_category_enum_old"`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "s3Key" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "s3Url" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "s3Url" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "s3Key" SET NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."resources_category_enum_old" AS ENUM('training', 'marketing', 'compliance', 'announcement', 'policy', 'guide', 'template', 'other')`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "category" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "category" TYPE "public"."resources_category_enum_old" USING "category"::"text"::"public"."resources_category_enum_old"`);
        await queryRunner.query(`ALTER TABLE "resources" ALTER COLUMN "category" SET DEFAULT 'other'`);
        await queryRunner.query(`DROP TYPE "public"."resources_category_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."resources_category_enum_old" RENAME TO "resources_category_enum"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "isExternal"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "isEmbedded"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "embeddedContent"`);
        await queryRunner.query(`ALTER TABLE "resources" DROP COLUMN "externalUrl"`);
    }

}
