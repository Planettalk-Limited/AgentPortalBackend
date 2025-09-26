import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeReferralCodeIdNullable1758730375094 implements MigrationInterface {
    name = 'MakeReferralCodeIdNullable1758730375094'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "referral_usages" DROP CONSTRAINT "FK_d98691c3db07e699cd052330e3a"`);
        await queryRunner.query(`ALTER TABLE "referral_usages" ALTER COLUMN "referralCodeId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "referral_usages" ADD CONSTRAINT "FK_d98691c3db07e699cd052330e3a" FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "referral_usages" DROP CONSTRAINT "FK_d98691c3db07e699cd052330e3a"`);
        await queryRunner.query(`ALTER TABLE "referral_usages" ALTER COLUMN "referralCodeId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "referral_usages" ADD CONSTRAINT "FK_d98691c3db07e699cd052330e3a" FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
