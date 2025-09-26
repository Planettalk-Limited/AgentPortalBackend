import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSetup1758530241751 implements MigrationInterface {
    name = 'InitialSetup1758530241751'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."referral_usages_status_enum" AS ENUM('pending', 'confirmed', 'cancelled', 'expired')`);
        await queryRunner.query(`CREATE TABLE "referral_usages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."referral_usages_status_enum" NOT NULL DEFAULT 'pending', "referredUserEmail" character varying(255), "referredUserName" character varying(100), "referredUserPhone" character varying(20), "commissionEarned" numeric(15,2), "commissionRate" numeric(5,2), "confirmedAt" TIMESTAMP, "ipAddress" character varying(45), "userAgent" text, "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "referralCodeId" uuid NOT NULL, "referredUserId" uuid, CONSTRAINT "PK_3ad28d39f0937eccddb4795f24d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c7ccb3bd65355adaebddf2bdce" ON "referral_usages" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_53431d62102165f61aeeae9098" ON "referral_usages" ("referredUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d98691c3db07e699cd052330e3" ON "referral_usages" ("referralCodeId") `);
        await queryRunner.query(`CREATE TYPE "public"."referral_codes_status_enum" AS ENUM('active', 'inactive', 'expired', 'suspended')`);
        await queryRunner.query(`CREATE TYPE "public"."referral_codes_type_enum" AS ENUM('standard', 'promotional', 'limited_time', 'vip')`);
        await queryRunner.query(`CREATE TABLE "referral_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(20) NOT NULL, "status" "public"."referral_codes_status_enum" NOT NULL DEFAULT 'active', "type" "public"."referral_codes_type_enum" NOT NULL DEFAULT 'standard', "description" character varying(255), "bonusCommissionRate" numeric(5,2), "maxUses" integer, "currentUses" integer NOT NULL DEFAULT '0', "expiresAt" TIMESTAMP, "lastUsedAt" TIMESTAMP, "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "agentId" uuid NOT NULL, CONSTRAINT "UQ_adda7b9deda346ff710695f4968" UNIQUE ("code"), CONSTRAINT "PK_99f08e2ed9d39d8ce902f5f1f41" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4d0b22c7c12a80441c21c782bc" ON "referral_codes" ("agentId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_adda7b9deda346ff710695f496" ON "referral_codes" ("code") `);
        await queryRunner.query(`CREATE TYPE "public"."agent_earnings_type_enum" AS ENUM('referral_commission', 'bonus', 'penalty', 'adjustment', 'promotion_bonus')`);
        await queryRunner.query(`CREATE TYPE "public"."agent_earnings_status_enum" AS ENUM('pending', 'confirmed', 'paid', 'cancelled', 'disputed')`);
        await queryRunner.query(`CREATE TABLE "agent_earnings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."agent_earnings_type_enum" NOT NULL DEFAULT 'referral_commission', "status" "public"."agent_earnings_status_enum" NOT NULL DEFAULT 'pending', "amount" numeric(15,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'USD', "commissionRate" numeric(5,2), "description" character varying(255), "referenceId" character varying(100), "earnedAt" TIMESTAMP NOT NULL, "confirmedAt" TIMESTAMP, "paidAt" TIMESTAMP, "paymentMethod" character varying(100), "paymentReference" character varying(100), "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "agentId" uuid NOT NULL, "referralUsageId" uuid, CONSTRAINT "PK_9f992ff81b753034a709cc31407" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3d628437c317926f63fdd95ef4" ON "agent_earnings" ("earnedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_1201da66919596fd0cb6c6587e" ON "agent_earnings" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_4ba975645be75c2340320d3a67" ON "agent_earnings" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_0c22ae26c49f52c369c8f25f8a" ON "agent_earnings" ("agentId") `);
        await queryRunner.query(`CREATE TYPE "public"."agent_applications_status_enum" AS ENUM('submitted', 'under_review', 'approved', 'rejected', 'pending_documents', 'withdrawn')`);
        await queryRunner.query(`CREATE TYPE "public"."agent_applications_source_enum" AS ENUM('web_form', 'referral', 'direct_contact', 'social_media', 'other')`);
        await queryRunner.query(`CREATE TABLE "agent_applications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."agent_applications_status_enum" NOT NULL DEFAULT 'submitted', "source" "public"."agent_applications_source_enum" NOT NULL DEFAULT 'web_form', "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "phoneNumber" character varying(20) NOT NULL, "dateOfBirth" date, "address" text, "city" character varying(100), "state" character varying(100), "zipCode" character varying(20), "country" character varying(100), "experience" text, "motivation" text, "currentEmployment" character varying(255), "hasLicense" boolean NOT NULL DEFAULT false, "licenseNumber" character varying(100), "licenseExpiryDate" date, "documents" json, "reviewedBy" uuid, "reviewedAt" TIMESTAMP, "reviewNotes" text, "rejectionReason" text, "submittedAt" TIMESTAMP NOT NULL, "metadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "agentId" uuid, CONSTRAINT "PK_615eac664249a5440ec25209501" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_38552285a115c6594ecf00239c" ON "agent_applications" ("submittedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_6814e0171d3479ca00901fb3c8" ON "agent_applications" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_0d5c883d8eeecdc7b460be1fc6" ON "agent_applications" ("agentId") `);
        await queryRunner.query(`CREATE TYPE "public"."agents_status_enum" AS ENUM('pending_application', 'application_approved', 'code_generated', 'credentials_sent', 'active', 'inactive', 'suspended')`);
        await queryRunner.query(`CREATE TYPE "public"."agents_tier_enum" AS ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond')`);
        await queryRunner.query(`CREATE TABLE "agents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "agentCode" character varying(20) NOT NULL, "status" "public"."agents_status_enum" NOT NULL DEFAULT 'pending_application', "tier" "public"."agents_tier_enum" NOT NULL DEFAULT 'bronze', "totalEarnings" numeric(15,2) NOT NULL DEFAULT '0', "availableBalance" numeric(15,2) NOT NULL DEFAULT '0', "pendingBalance" numeric(15,2) NOT NULL DEFAULT '0', "totalReferrals" integer NOT NULL DEFAULT '0', "activeReferrals" integer NOT NULL DEFAULT '0', "commissionRate" numeric(5,2) NOT NULL DEFAULT '10', "notes" text, "metadata" json, "activatedAt" TIMESTAMP, "lastActivityAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid NOT NULL, CONSTRAINT "UQ_fe6088b21071f046d45f72b728d" UNIQUE ("agentCode"), CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f535e5b2c0f0dc7b7fc656ebc9" ON "agents" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fe6088b21071f046d45f72b728" ON "agents" ("agentCode") `);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'pt_admin', 'agent')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'suspended', 'pending')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "username" character varying(50), "email" character varying(255) NOT NULL, "passwordHash" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'agent', "status" "public"."users_status_enum" NOT NULL DEFAULT 'pending', "phoneNumber" character varying(20), "lastLoginAt" TIMESTAMP, "emailVerifiedAt" TIMESTAMP, "isFirstLogin" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users" ("username") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`ALTER TABLE "referral_usages" ADD CONSTRAINT "FK_d98691c3db07e699cd052330e3a" FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "referral_usages" ADD CONSTRAINT "FK_53431d62102165f61aeeae9098f" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "referral_codes" ADD CONSTRAINT "FK_4d0b22c7c12a80441c21c782bce" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agent_earnings" ADD CONSTRAINT "FK_0c22ae26c49f52c369c8f25f8ab" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agent_earnings" ADD CONSTRAINT "FK_8eba01fe8cc0edc7e67260e2029" FOREIGN KEY ("referralUsageId") REFERENCES "referral_usages"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agent_applications" ADD CONSTRAINT "FK_0d5c883d8eeecdc7b460be1fc63" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agent_applications" ADD CONSTRAINT "FK_2b2f677f594d084b99596dd16a9" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agents" ADD CONSTRAINT "FK_f535e5b2c0f0dc7b7fc656ebc91" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agents" DROP CONSTRAINT "FK_f535e5b2c0f0dc7b7fc656ebc91"`);
        await queryRunner.query(`ALTER TABLE "agent_applications" DROP CONSTRAINT "FK_2b2f677f594d084b99596dd16a9"`);
        await queryRunner.query(`ALTER TABLE "agent_applications" DROP CONSTRAINT "FK_0d5c883d8eeecdc7b460be1fc63"`);
        await queryRunner.query(`ALTER TABLE "agent_earnings" DROP CONSTRAINT "FK_8eba01fe8cc0edc7e67260e2029"`);
        await queryRunner.query(`ALTER TABLE "agent_earnings" DROP CONSTRAINT "FK_0c22ae26c49f52c369c8f25f8ab"`);
        await queryRunner.query(`ALTER TABLE "referral_codes" DROP CONSTRAINT "FK_4d0b22c7c12a80441c21c782bce"`);
        await queryRunner.query(`ALTER TABLE "referral_usages" DROP CONSTRAINT "FK_53431d62102165f61aeeae9098f"`);
        await queryRunner.query(`ALTER TABLE "referral_usages" DROP CONSTRAINT "FK_d98691c3db07e699cd052330e3a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe0bb3f6520ee0469504521e71"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fe6088b21071f046d45f72b728"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f535e5b2c0f0dc7b7fc656ebc9"`);
        await queryRunner.query(`DROP TABLE "agents"`);
        await queryRunner.query(`DROP TYPE "public"."agents_tier_enum"`);
        await queryRunner.query(`DROP TYPE "public"."agents_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0d5c883d8eeecdc7b460be1fc6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6814e0171d3479ca00901fb3c8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_38552285a115c6594ecf00239c"`);
        await queryRunner.query(`DROP TABLE "agent_applications"`);
        await queryRunner.query(`DROP TYPE "public"."agent_applications_source_enum"`);
        await queryRunner.query(`DROP TYPE "public"."agent_applications_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0c22ae26c49f52c369c8f25f8a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4ba975645be75c2340320d3a67"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1201da66919596fd0cb6c6587e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3d628437c317926f63fdd95ef4"`);
        await queryRunner.query(`DROP TABLE "agent_earnings"`);
        await queryRunner.query(`DROP TYPE "public"."agent_earnings_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."agent_earnings_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_adda7b9deda346ff710695f496"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4d0b22c7c12a80441c21c782bc"`);
        await queryRunner.query(`DROP TABLE "referral_codes"`);
        await queryRunner.query(`DROP TYPE "public"."referral_codes_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."referral_codes_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d98691c3db07e699cd052330e3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_53431d62102165f61aeeae9098"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c7ccb3bd65355adaebddf2bdce"`);
        await queryRunner.query(`DROP TABLE "referral_usages"`);
        await queryRunner.query(`DROP TYPE "public"."referral_usages_status_enum"`);
    }

}
