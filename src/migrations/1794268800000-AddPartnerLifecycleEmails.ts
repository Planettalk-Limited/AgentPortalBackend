import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Partner lifecycle emails: per-partner tracking state, the send log (whose unique
 * (agentId, dedupeKey) index is the once-only guarantee), and Mailgun webhook events.
 */
export class AddPartnerLifecycleEmails1794268800000 implements MigrationInterface {
  name = 'AddPartnerLifecycleEmails1794268800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "partner_lifecycle_state" (
        "agentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "trackingStartedAt" TIMESTAMP NOT NULL,
        "referralBaseline" integer NOT NULL DEFAULT 0,
        "referralHighWater" integer NOT NULL DEFAULT 0,
        "lastReferralAt" TIMESTAMP,
        "earningsBaseline" numeric(15,2),
        "earningsHighWater" numeric(15,2) NOT NULL DEFAULT 0,
        "lastEarningsIncreaseAt" TIMESTAMP,
        "inactiveCycle" integer NOT NULL DEFAULT 0,
        "inactiveTrackStartedAt" TIMESTAMP,
        "quietAt" TIMESTAMP,
        "unsubscribedAt" TIMESTAMP,
        "unsubscribeSource" character varying(40),
        "lastEvaluatedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_partner_lifecycle_state" PRIMARY KEY ("agentId"),
        CONSTRAINT "FK_partner_lifecycle_state_agent" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(`CREATE INDEX "IDX_partner_lifecycle_state_user" ON "partner_lifecycle_state" ("userId")`);

    await queryRunner.query(`
      CREATE TABLE "lifecycle_emails" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "agentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "templateKey" character varying(64) NOT NULL,
        "dedupeKey" character varying(128) NOT NULL,
        "segment" character varying(32) NOT NULL,
        "status" character varying(16) NOT NULL,
        "recipient" character varying(255),
        "subject" character varying(255),
        "mailgunMessageId" character varying(255),
        "attempts" integer NOT NULL DEFAULT 0,
        "lastError" text,
        "sentAt" TIMESTAMP,
        "deliveredAt" TIMESTAMP,
        "firstOpenedAt" TIMESTAMP,
        "firstClickedAt" TIMESTAMP,
        "openCount" integer NOT NULL DEFAULT 0,
        "clickCount" integer NOT NULL DEFAULT 0,
        "unsubscribedAt" TIMESTAMP,
        "convertedAt" TIMESTAMP,
        "conversionType" character varying(32),
        "context" json,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lifecycle_emails" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lifecycle_emails_agent" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_lifecycle_emails_agent_dedupe" ON "lifecycle_emails" ("agentId", "dedupeKey")`);
    await queryRunner.query(`CREATE INDEX "IDX_lifecycle_emails_template_sent" ON "lifecycle_emails" ("templateKey", "sentAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_lifecycle_emails_message" ON "lifecycle_emails" ("mailgunMessageId")`);

    await queryRunner.query(`
      CREATE TABLE "lifecycle_email_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mailgunEventId" character varying(255) NOT NULL,
        "lifecycleEmailId" uuid,
        "mailgunMessageId" character varying(255),
        "event" character varying(32) NOT NULL,
        "recipient" character varying(255),
        "url" text,
        "occurredAt" TIMESTAMP NOT NULL,
        "payload" json,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lifecycle_email_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lifecycle_email_events_email" FOREIGN KEY ("lifecycleEmailId") REFERENCES "lifecycle_emails"("id") ON DELETE SET NULL
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_lifecycle_email_events_mailgun_id" ON "lifecycle_email_events" ("mailgunEventId")`);
    await queryRunner.query(`CREATE INDEX "IDX_lifecycle_email_events_email" ON "lifecycle_email_events" ("lifecycleEmailId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "lifecycle_email_events"`);
    await queryRunner.query(`DROP TABLE "lifecycle_emails"`);
    await queryRunner.query(`DROP TABLE "partner_lifecycle_state"`);
  }
}
