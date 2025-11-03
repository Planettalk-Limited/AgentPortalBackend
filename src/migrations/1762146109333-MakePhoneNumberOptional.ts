import { MigrationInterface, QueryRunner } from "typeorm";

export class MakePhoneNumberOptional1762146109333 implements MigrationInterface {
    name = 'MakePhoneNumberOptional1762146109333'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent_applications" ALTER COLUMN "phoneNumber" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent_applications" ALTER COLUMN "phoneNumber" SET NOT NULL`);
    }

}
