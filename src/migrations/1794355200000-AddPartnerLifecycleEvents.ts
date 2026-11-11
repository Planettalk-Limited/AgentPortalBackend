import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Partner lifecycle dashboard events: referral milestones crossed and comebacks from
 * the inactive track, one row per (agentId, dedupeKey).
 */
export class AddPartnerLifecycleEvents1794355200000 implements MigrationInterface {
  name = 'AddPartnerLifecycleEvents1794355200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "partner_lifecycle_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "agentId" uuid NOT NULL,
        "type" character varying(32) NOT NULL,
        "dedupeKey" character varying(64) NOT NULL,
        "value" integer,
        "occurredAt" TIMESTAMP NOT NULL,
        "context" json,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_partner_lifecycle_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_partner_lifecycle_events_agent" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_partner_lifecycle_events_agent_dedupe" ON "partner_lifecycle_events" ("agentId", "dedupeKey")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_partner_lifecycle_events_type_occurred" ON "partner_lifecycle_events" ("type", "occurredAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "partner_lifecycle_events"`);
  }
}
