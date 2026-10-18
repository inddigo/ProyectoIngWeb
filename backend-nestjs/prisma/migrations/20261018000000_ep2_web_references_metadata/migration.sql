-- AlterTable
ALTER TABLE "web_references" ADD COLUMN     "creator" TEXT,
ADD COLUMN     "license" TEXT,
ADD COLUMN     "query_used" TEXT,
ADD COLUMN     "retrieved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "source_url" TEXT;

-- CreateIndex
CREATE INDEX "web_references_order_id_idx" ON "web_references"("order_id");

-- CreateIndex
CREATE INDEX "web_references_source_idx" ON "web_references"("source");

-- CreateIndex
CREATE INDEX "web_references_query_used_idx" ON "web_references"("query_used");

-- CreateIndex
CREATE UNIQUE INDEX "web_references_order_id_image_url_key" ON "web_references"("order_id", "image_url");
