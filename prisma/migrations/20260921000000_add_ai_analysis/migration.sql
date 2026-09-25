-- Add AI Analysis model
CREATE TABLE "ai_analyses" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "scanId"        UUID         NOT NULL,
  "provider"      VARCHAR(50)  NOT NULL DEFAULT 'openai',
  "model"         VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
  "assessment"    TEXT         NOT NULL,
  "confidence"    INTEGER      NOT NULL DEFAULT 0,
  "reasoning"     TEXT,
  "additionalIndicators" JSONB,
  "recommendations" JSONB,
  "status"        VARCHAR(20)  NOT NULL DEFAULT 'success',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_analyses_scanId_key" UNIQUE ("scanId"),
  CONSTRAINT "ai_analyses_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ai_analyses_scanId_idx" ON "ai_analyses"("scanId");
