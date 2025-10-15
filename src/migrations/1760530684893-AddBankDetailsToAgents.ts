import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBankDetailsToAgents1760530684893 implements MigrationInterface {
    name = 'AddBankDetailsToAgents1760530684893'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agents" ADD "bankDetails" json`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agents" DROP COLUMN "bankDetails"`);
    }

}
