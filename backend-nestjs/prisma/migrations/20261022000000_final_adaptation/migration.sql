ALTER TABLE "quotes" ADD COLUMN "professional_id" TEXT;
ALTER TABLE "quotes" ADD COLUMN "recommendation_id" TEXT;
CREATE TABLE "professional_profiles" (
  "user_id" TEXT PRIMARY KEY,
  "hourly_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "fixed_costs" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "profit_margin" DOUBLE PRECISION NOT NULL DEFAULT 30,
  "use_history" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "professional_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "recommendations" (
  "id" TEXT PRIMARY KEY,
  "order_id" TEXT NOT NULL,
  "professional_id" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recommendations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "recommendations_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "recommendations_professional_id_created_at_idx" ON "recommendations"("professional_id", "created_at");
CREATE INDEX "quotes_professional_id_created_at_idx" ON "quotes"("professional_id", "created_at");
CREATE UNIQUE INDEX "quotes_recommendation_id_key" ON "quotes"("recommendation_id");
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
