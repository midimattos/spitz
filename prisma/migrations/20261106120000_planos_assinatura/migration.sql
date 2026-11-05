-- Planos de assinatura (1, 3, 6, 12 meses): cada pagamento guarda quantos meses de acesso compra.
ALTER TABLE "Pagamento" ADD COLUMN "meses" INTEGER;
