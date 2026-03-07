CREATE TYPE "TriggerType" AS ENUM ('WEBHOOK', 'SCHEDULED', 'MANUAL');

ALTER TABLE "workflows"
ADD COLUMN "triggerType" "TriggerType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "triggerConfig" JSONB;

CREATE INDEX "workflows_triggerType_idx" ON "workflows"("triggerType");
