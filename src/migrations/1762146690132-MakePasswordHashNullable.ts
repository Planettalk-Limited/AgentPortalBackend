import { MigrationInterface, QueryRunner } from "typeorm";

export class MakePasswordHashNullable1762146690132 implements MigrationInterface {
    name = 'MakePasswordHashNullable1762146690132'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent_applications" ALTER COLUMN "phoneNumber" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "passwordHash" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "agent_applications" ALTER COLUMN "phoneNumber" SET NOT NULL`);
    }

}
