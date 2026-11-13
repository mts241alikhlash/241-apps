CREATE TABLE "seb_configs" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "config_key" CHAR(64) NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seb_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seb_configs_config_key_key" ON "seb_configs"("config_key");
