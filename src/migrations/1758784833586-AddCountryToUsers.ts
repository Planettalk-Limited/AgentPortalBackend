import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCountryToUsers1758784833586 implements MigrationInterface {
    name = 'AddCountryToUsers1758784833586'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add the column as nullable first
        await queryRunner.query(`ALTER TABLE "users" ADD "country" character varying(2)`);
        
        // Set a default country for existing users (US as default)
        await queryRunner.query(`UPDATE "users" SET "country" = 'US' WHERE "country" IS NULL`);
        
        // Now make the column NOT NULL
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "country" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "country"`);
    }

}
