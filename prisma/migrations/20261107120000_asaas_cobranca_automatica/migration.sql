-- Cobrança automática pelo Asaas
ALTER TABLE "Canil" ADD COLUMN "asaasCustomerId" TEXT,
ADD COLUMN "asaasSubscriptionId" TEXT,
ADD COLUMN "planoMeses" INTEGER;

ALTER TABLE "Pagamento" ADD COLUMN "asaasCheckoutId" TEXT,
ADD COLUMN "asaasPaymentId" TEXT;
CREATE UNIQUE INDEX "Pagamento_asaasPaymentId_key" ON "Pagamento"("asaasPaymentId");

CREATE TABLE "WebhookEvento" (
    "id" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvento_pkey" PRIMARY KEY ("id")
);
