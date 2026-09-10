-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CRIADOR', 'COMPRADOR');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MACHO', 'FEMEA');

-- CreateEnum
CREATE TYPE "PapelCao" AS ENUM ('MATRIZ', 'PADREADOR', 'FILHOTE', 'APOSENTADO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('PEDIGREE', 'RECIBO_VETERINARIO', 'MICROCHIP', 'CONTRATO_COPROPRIEDADE', 'LAUDO_MEDICO', 'LAUDO_GENETICO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusGenetico" AS ENUM ('LIVRE', 'PORTADOR', 'AFETADO');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "TipoAnuncio" AS ENUM ('GRATUITO', 'PREMIUM');

-- CreateEnum
CREATE TYPE "StatusAnuncio" AS ENUM ('RASCUNHO', 'PUBLICADO', 'PAUSADO', 'VENDIDO');

-- CreateEnum
CREATE TYPE "StatusOptIn" AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "TipoPagamento" AS ENUM ('ASSINATURA_PRO', 'ANUNCIO_PREMIUM', 'COMISSAO_VENDA');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'COMPRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Canil" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cidade" TEXT,
    "estado" TEXT,
    "descricao" TEXT,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "assinaturaPro" BOOLEAN NOT NULL DEFAULT false,
    "telefoneContato" TEXT,
    "instagram" TEXT,
    "solicitacaoVerificacaoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Canil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "papel" "PapelCao" NOT NULL DEFAULT 'FILHOTE',
    "fotoUrl" TEXT,
    "corPelagem" TEXT,
    "porte" TEXT,
    "microchip" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "dataFalecimento" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "corBase" TEXT,
    "marcacaoCor" TEXT,
    "corTrufa" TEXT,
    "diluicaoCor" TEXT,
    "merleCor" TEXT,
    "intensidadeCor" TEXT,
    "coresJaProduzidas" TEXT[],
    "temExameCorDNA" BOOLEAN NOT NULL DEFAULT false,
    "dnaLocusB" TEXT,
    "dnaLocusE" TEXT,
    "dnaLocusK" TEXT,
    "dnaLocusA" TEXT,
    "dnaLocusD" TEXT,
    "dnaLocusS" TEXT,
    "dnaLocusM" TEXT,
    "dnaLocusI" TEXT,
    "canilId" TEXT NOT NULL,
    "paiId" TEXT,
    "maeId" TEXT,

    CONSTRAINT "Cao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "caoId" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaudoGenetico" (
    "id" TEXT NOT NULL,
    "caoId" TEXT NOT NULL,
    "laboratorio" TEXT NOT NULL,
    "dataLaudo" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentoId" TEXT,

    CONSTRAINT "LaudoGenetico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultadoGenetico" (
    "id" TEXT NOT NULL,
    "laudoId" TEXT NOT NULL,
    "condicao" TEXT NOT NULL,
    "status" "StatusGenetico" NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "ResultadoGenetico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LancamentoFinanceiro" (
    "id" TEXT NOT NULL,
    "canilId" TEXT NOT NULL,
    "caoId" TEXT,
    "tipo" "TipoLancamento" NOT NULL,
    "categoria" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LancamentoFinanceiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CicloCio" (
    "id" TEXT NOT NULL,
    "caoId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CicloCio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ninhada" (
    "id" TEXT NOT NULL,
    "caoMaeId" TEXT NOT NULL,
    "caoPaiId" TEXT,
    "padreadorExterno" TEXT,
    "dataCobertura" TIMESTAMP(3) NOT NULL,
    "dataPrevistaParto" TIMESTAMP(3) NOT NULL,
    "dataParto" TIMESTAMP(3),
    "quantidadeFilhotes" INTEGER,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ninhada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossieGenetico" (
    "id" TEXT NOT NULL,
    "caoId" TEXT NOT NULL,
    "slugPublico" TEXT NOT NULL,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "coi" DOUBLE PRECISION,
    "geradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DossieGenetico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaixaPrecoBase" (
    "id" TEXT NOT NULL,
    "canilId" TEXT NOT NULL,
    "porte" TEXT NOT NULL,
    "precoMinimo" DECIMAL(10,2) NOT NULL,
    "precoMedio" DECIMAL(10,2) NOT NULL,
    "precoMaximo" DECIMAL(10,2) NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaixaPrecoBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anuncio" (
    "id" TEXT NOT NULL,
    "caoId" TEXT NOT NULL,
    "canilId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL(10,2) NOT NULL,
    "tipo" "TipoAnuncio" NOT NULL DEFAULT 'GRATUITO',
    "status" "StatusAnuncio" NOT NULL DEFAULT 'RASCUNHO',
    "fotos" TEXT[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anuncio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensagemContato" (
    "id" TEXT NOT NULL,
    "anuncioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemContato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" TEXT NOT NULL,
    "canilId" TEXT NOT NULL,
    "autorUserId" TEXT,
    "autorNome" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "oculta" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesejoComprador" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "porte" TEXT,
    "sexo" "Sexo",
    "precoMax" DECIMAL(10,2),
    "corPelagem" TEXT,
    "estado" TEXT,
    "telefone" TEXT NOT NULL,
    "cpf" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesejoComprador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "desejoId" TEXT NOT NULL,
    "anuncioId" TEXT NOT NULL,
    "statusComprador" "StatusOptIn" NOT NULL DEFAULT 'PENDENTE',
    "statusCriador" "StatusOptIn" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DenunciaLead" (
    "id" TEXT NOT NULL,
    "mensagemContatoId" TEXT,
    "matchId" TEXT,
    "motivo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DenunciaLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "canilId" TEXT NOT NULL,
    "anuncioId" TEXT,
    "tipo" "TipoPagamento" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "mercadoPagoPreferenceId" TEXT,
    "mercadoPagoPaymentId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Convite" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "criadoPorCanilId" TEXT,
    "usadoPorCanilId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usadoEm" TIMESTAMP(3),

    CONSTRAINT "Convite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Canil_slug_key" ON "Canil"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Canil_ownerId_key" ON "Canil"("ownerId");

-- CreateIndex
CREATE INDEX "Canil_verificado_idx" ON "Canil"("verificado");

-- CreateIndex
CREATE INDEX "Cao_canilId_idx" ON "Cao"("canilId");

-- CreateIndex
CREATE INDEX "Cao_papel_idx" ON "Cao"("papel");

-- CreateIndex
CREATE INDEX "Documento_caoId_idx" ON "Documento"("caoId");

-- CreateIndex
CREATE UNIQUE INDEX "LaudoGenetico_documentoId_key" ON "LaudoGenetico"("documentoId");

-- CreateIndex
CREATE INDEX "LaudoGenetico_caoId_idx" ON "LaudoGenetico"("caoId");

-- CreateIndex
CREATE INDEX "ResultadoGenetico_laudoId_idx" ON "ResultadoGenetico"("laudoId");

-- CreateIndex
CREATE INDEX "ResultadoGenetico_condicao_idx" ON "ResultadoGenetico"("condicao");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_canilId_idx" ON "LancamentoFinanceiro"("canilId");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_caoId_idx" ON "LancamentoFinanceiro"("caoId");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_tipo_idx" ON "LancamentoFinanceiro"("tipo");

-- CreateIndex
CREATE INDEX "CicloCio_caoId_idx" ON "CicloCio"("caoId");

-- CreateIndex
CREATE INDEX "Ninhada_caoMaeId_idx" ON "Ninhada"("caoMaeId");

-- CreateIndex
CREATE UNIQUE INDEX "DossieGenetico_caoId_key" ON "DossieGenetico"("caoId");

-- CreateIndex
CREATE UNIQUE INDEX "DossieGenetico_slugPublico_key" ON "DossieGenetico"("slugPublico");

-- CreateIndex
CREATE INDEX "DossieGenetico_slugPublico_idx" ON "DossieGenetico"("slugPublico");

-- CreateIndex
CREATE UNIQUE INDEX "FaixaPrecoBase_canilId_porte_key" ON "FaixaPrecoBase"("canilId", "porte");

-- CreateIndex
CREATE INDEX "Anuncio_canilId_idx" ON "Anuncio"("canilId");

-- CreateIndex
CREATE INDEX "Anuncio_status_idx" ON "Anuncio"("status");

-- CreateIndex
CREATE INDEX "MensagemContato_anuncioId_idx" ON "MensagemContato"("anuncioId");

-- CreateIndex
CREATE INDEX "Avaliacao_canilId_idx" ON "Avaliacao"("canilId");

-- CreateIndex
CREATE UNIQUE INDEX "DesejoComprador_userId_key" ON "DesejoComprador"("userId");

-- CreateIndex
CREATE INDEX "Match_anuncioId_idx" ON "Match"("anuncioId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_desejoId_anuncioId_key" ON "Match"("desejoId", "anuncioId");

-- CreateIndex
CREATE UNIQUE INDEX "DenunciaLead_mensagemContatoId_key" ON "DenunciaLead"("mensagemContatoId");

-- CreateIndex
CREATE UNIQUE INDEX "DenunciaLead_matchId_key" ON "DenunciaLead"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_mercadoPagoPaymentId_key" ON "Pagamento"("mercadoPagoPaymentId");

-- CreateIndex
CREATE INDEX "Pagamento_canilId_idx" ON "Pagamento"("canilId");

-- CreateIndex
CREATE INDEX "Pagamento_anuncioId_idx" ON "Pagamento"("anuncioId");

-- CreateIndex
CREATE INDEX "Pagamento_status_idx" ON "Pagamento"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Convite_codigo_key" ON "Convite"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Convite_usadoPorCanilId_key" ON "Convite"("usadoPorCanilId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Canil" ADD CONSTRAINT "Canil_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cao" ADD CONSTRAINT "Cao_canilId_fkey" FOREIGN KEY ("canilId") REFERENCES "Canil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cao" ADD CONSTRAINT "Cao_paiId_fkey" FOREIGN KEY ("paiId") REFERENCES "Cao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cao" ADD CONSTRAINT "Cao_maeId_fkey" FOREIGN KEY ("maeId") REFERENCES "Cao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_caoId_fkey" FOREIGN KEY ("caoId") REFERENCES "Cao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaudoGenetico" ADD CONSTRAINT "LaudoGenetico_caoId_fkey" FOREIGN KEY ("caoId") REFERENCES "Cao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaudoGenetico" ADD CONSTRAINT "LaudoGenetico_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoGenetico" ADD CONSTRAINT "ResultadoGenetico_laudoId_fkey" FOREIGN KEY ("laudoId") REFERENCES "LaudoGenetico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_canilId_fkey" FOREIGN KEY ("canilId") REFERENCES "Canil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_caoId_fkey" FOREIGN KEY ("caoId") REFERENCES "Cao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CicloCio" ADD CONSTRAINT "CicloCio_caoId_fkey" FOREIGN KEY ("caoId") REFERENCES "Cao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ninhada" ADD CONSTRAINT "Ninhada_caoMaeId_fkey" FOREIGN KEY ("caoMaeId") REFERENCES "Cao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ninhada" ADD CONSTRAINT "Ninhada_caoPaiId_fkey" FOREIGN KEY ("caoPaiId") REFERENCES "Cao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossieGenetico" ADD CONSTRAINT "DossieGenetico_caoId_fkey" FOREIGN KEY ("caoId") REFERENCES "Cao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaixaPrecoBase" ADD CONSTRAINT "FaixaPrecoBase_canilId_fkey" FOREIGN KEY ("canilId") REFERENCES "Canil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anuncio" ADD CONSTRAINT "Anuncio_caoId_fkey" FOREIGN KEY ("caoId") REFERENCES "Cao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anuncio" ADD CONSTRAINT "Anuncio_canilId_fkey" FOREIGN KEY ("canilId") REFERENCES "Canil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemContato" ADD CONSTRAINT "MensagemContato_anuncioId_fkey" FOREIGN KEY ("anuncioId") REFERENCES "Anuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_canilId_fkey" FOREIGN KEY ("canilId") REFERENCES "Canil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesejoComprador" ADD CONSTRAINT "DesejoComprador_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_desejoId_fkey" FOREIGN KEY ("desejoId") REFERENCES "DesejoComprador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_anuncioId_fkey" FOREIGN KEY ("anuncioId") REFERENCES "Anuncio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DenunciaLead" ADD CONSTRAINT "DenunciaLead_mensagemContatoId_fkey" FOREIGN KEY ("mensagemContatoId") REFERENCES "MensagemContato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DenunciaLead" ADD CONSTRAINT "DenunciaLead_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_canilId_fkey" FOREIGN KEY ("canilId") REFERENCES "Canil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_anuncioId_fkey" FOREIGN KEY ("anuncioId") REFERENCES "Anuncio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convite" ADD CONSTRAINT "Convite_criadoPorCanilId_fkey" FOREIGN KEY ("criadoPorCanilId") REFERENCES "Canil"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convite" ADD CONSTRAINT "Convite_usadoPorCanilId_fkey" FOREIGN KEY ("usadoPorCanilId") REFERENCES "Canil"("id") ON DELETE SET NULL ON UPDATE CASCADE;
