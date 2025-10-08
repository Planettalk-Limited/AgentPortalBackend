import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResourcesTable1759907367710 implements MigrationInterface {
    name = 'AddResourcesTable1759907367710'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."resources_type_enum" AS ENUM('document', 'image', 'video', 'audio', 'archive', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."resources_category_enum" AS ENUM('training', 'marketing', 'compliance', 'announcement', 'policy', 'guide', 'template', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."resources_visibility_enum" AS ENUM('public', 'private', 'restricted')`);
        await queryRunner.query(`CREATE TABLE "resources" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "description" text, "fileName" character varying(255) NOT NULL, "originalName" character varying(255) NOT NULL, "mimeType" character varying(100) NOT NULL, "fileSize" bigint NOT NULL, "type" "public"."resources_type_enum" NOT NULL DEFAULT 'document', "category" "public"."resources_category_enum" NOT NULL DEFAULT 'other', "visibility" "public"."resources_visibility_enum" NOT NULL DEFAULT 'public', "s3Key" text NOT NULL, "s3Url" text NOT NULL, "s3Bucket" character varying(100), "isActive" boolean NOT NULL DEFAULT true, "isFeatured" boolean NOT NULL DEFAULT false, "downloadCount" integer NOT NULL DEFAULT '0', "viewCount" integer NOT NULL DEFAULT '0', "publishedAt" TIMESTAMP, "expiresAt" TIMESTAMP, "metadata" json, "tags" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "uploadedById" uuid NOT NULL, CONSTRAINT "PK_632484ab9dff41bba94f9b7c85e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7c51533b45ded10400a03adbd7" ON "resources" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_672d223331b1d976acfa4bea9e" ON "resources" ("isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_86cac460287b43e52b690e887a" ON "resources" ("visibility") `);
        await queryRunner.query(`CREATE INDEX "IDX_6ef375507e3ef53de4f0db5dbc" ON "resources" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_4e1b470cad50d04f4436224fb8" ON "resources" ("category") `);
        await queryRunner.query(`ALTER TABLE "resources" ADD CONSTRAINT "FK_d7b99643067b3959a9557bf958e" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "resources" DROP CONSTRAINT "FK_d7b99643067b3959a9557bf958e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4e1b470cad50d04f4436224fb8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6ef375507e3ef53de4f0db5dbc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_86cac460287b43e52b690e887a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_672d223331b1d976acfa4bea9e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7c51533b45ded10400a03adbd7"`);
        await queryRunner.query(`DROP TABLE "resources"`);
        await queryRunner.query(`DROP TYPE "public"."resources_visibility_enum"`);
        await queryRunner.query(`DROP TYPE "public"."resources_category_enum"`);
        await queryRunner.query(`DROP TYPE "public"."resources_type_enum"`);
    }

}
