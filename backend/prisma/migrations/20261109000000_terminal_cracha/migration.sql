-- Terminais autorizados por aparelho (chave) e login por crachá por terminal
ALTER TABLE "terminais" ALTER COLUMN "ip" DROP NOT NULL;
ALTER TABLE "terminais" ADD COLUMN "token_hash" TEXT;
ALTER TABLE "terminais" ADD COLUMN "cracha" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "terminais_token_hash_key" ON "terminais"("token_hash");
