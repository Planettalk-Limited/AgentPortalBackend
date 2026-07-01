import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReferralBonusIncomeToAgents1782864000000 implements MigrationInterface {
    name = 'AddReferralBonusIncomeToAgents1782864000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agents" ADD "totalReferralBonusIncome" decimal(15,2) NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "agents" ADD "referralBonusIncomeCurrentMonth" decimal(15,2) NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agents" DROP COLUMN "referralBonusIncomeCurrentMonth"`);
        await queryRunner.query(`ALTER TABLE "agents" DROP COLUMN "totalReferralBonusIncome"`);
    }

}
