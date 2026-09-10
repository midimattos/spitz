# Plataforma Spitz Alemão — Fases 0 a 10 (roadmap completo)

Este pacote contém as dez fases do plano original: fundação (autenticação,
banco de dados), gestão de plantel, genética, financeiro/reprodutivo,
dossiê genético, precificação dinâmica, marketplace, radar de demanda,
inteligência de mercado, pagamentos reais e growth/operação.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma ORM
- NextAuth (Auth.js v5) com login por e-mail/senha
- Middleware protegendo `/admin`, `/dashboard/criador` e `/dashboard/comprador` por perfil

## 1. Rodando localmente

### Pré-requisitos
- Node.js 20+
- Um banco PostgreSQL (local via Docker, ou gratuito na nuvem — veja a seção de deploy)

### Passo a passo

```bash
# 1. Instale as dependências (isso já roda "prisma generate" sozinho)
npm install

# 2. Copie o arquivo de variáveis de ambiente
cp .env.example .env

# 3. Edite o .env e cole a DATABASE_URL do seu banco PostgreSQL
#    Gere o NEXTAUTH_SECRET com:
openssl rand -base64 32

# 4. Crie as tabelas no banco a partir do schema do Prisma
npm run db:migrate
# vai pedir um nome para a migration, ex: "init"

# 5. Rode o projeto
npm run dev
```

Acesse `http://localhost:3000`. Crie uma conta em `/register` escolhendo
"Sou criador" ou "Quero um filhote" — isso define o seu perfil e para qual
dashboard você é redirecionado.

Use `npm run db:studio` para abrir uma interface visual do banco (Prisma
Studio) e conferir os dados direto no navegador.

## 2. Colocando no ar (deploy)

### 2.1. Banco de dados (Neon — PostgreSQL grátis na nuvem)
1. Crie uma conta em https://neon.tech
2. Crie um projeto → copie a "Connection string"
3. Guarde essa string, você vai usar como `DATABASE_URL`

*(Alternativas equivalentes: Supabase, Railway, Vercel Postgres.)*

### 2.2. Subir o código para o GitHub
```bash
cd spitz-platform
git init
git add .
git commit -m "Fases 0 e 1"
```
Crie um repositório vazio no GitHub e siga as instruções que ele mostra para
enviar (`git remote add origin ...` e `git push`).

### 2.3. Deploy na Vercel
1. Crie uma conta em https://vercel.com (dá para logar com o GitHub)
2. "Add New Project" → selecione o repositório
3. Em "Environment Variables", adicione:
   - `DATABASE_URL` → a connection string do Neon
   - `NEXTAUTH_SECRET` → o valor gerado com `openssl rand -base64 32`
   - `NEXTAUTH_URL` → a URL que a Vercel vai te dar
4. Clique em "Deploy"

### 2.4. Rodar as migrations no banco de produção
```bash
DATABASE_URL="a-connection-string-do-neon" npx prisma migrate deploy
```

## 3. Estrutura de pastas

```
src/
  app/
    page.tsx                            → landing page
    login/                              → tela de login
    register/                           → tela de cadastro (criador ou comprador)
    dashboard/criador/                  → área do criador (protegida)
      plantel/                         → listagem, cadastro, ficha e edição de cães
    dashboard/comprador/                 → área do comprador (protegida)
    admin/                               → área administrativa (protegida)
    api/auth/[...nextauth]/              → rotas do NextAuth
    api/register/                        → criação de usuário (e canil, se CRIADOR)
    api/caes/                            → CRUD de cães do plantel
    api/caes/[id]/documentos/            → upload/listagem de documentos (Gaveta Digital)
  lib/
    auth.ts                              → configuração do NextAuth
    prisma.ts                            → cliente do Prisma
    canil.ts                             → helper para achar o canil do criador logado
    storage.ts                           → salvar arquivos (local, ver ressalva abaixo)
  middleware.ts                          → protege rotas por perfil
prisma/
  schema.prisma                          → modelos do banco (User, Canil, Cao, Documento, ...)
```

## 4. Fase 1 — Gestão do Plantel

Ao entrar como criador, o dashboard leva para `/dashboard/criador/plantel`:

- **Cadastrar cão**: nome, sexo, papel (matriz / padreador / filhote /
  aposentado), cor, porte, microchip, data de nascimento, e os campos de
  **pai** e **mãe** (selecionados entre os cães já cadastrados no seu canil)
- **Ficha do cão**: dados gerais, árvore genealógica (pai/mãe clicáveis, e
  filhos já registrados) e a **Gaveta Digital**
- **Gaveta digital**: upload de documentos (pedigree, recibo veterinário,
  microchip, contrato de copropriedade, laudo médico, outro)

Todo criador que se cadastra já ganha um canil automaticamente (nome
provisório "Canil {seu nome}"), para que o Plantel funcione desde o primeiro
acesso.

### Sobre o armazenamento de documentos
Os arquivos da Gaveta Digital são salvos em `public/uploads/` no disco do
próprio servidor (`src/lib/storage.ts`). Funciona bem em desenvolvimento
local, mas **não funciona na Vercel** (disco somente leitura e não
persistente entre deploys). Antes de usar essa funcionalidade em produção,
troque `salvarArquivo()` em `src/lib/storage.ts` por um upload para S3 ou
Cloudflare R2 — a assinatura da função já foi pensada para essa troca ser
simples. Isso pode ser feito junto com o Dossiê Genético (Fase 4), que
também vai gerar arquivos.

## 5. Fase 2 — Inteligência Genética e Saúde

Na ficha de cada cão (`/dashboard/criador/plantel/[id]`), agora existe a
seção **Genética e saúde**:

- **Cadastro de laudos**: laboratório, data e uma lista de condições
  testadas, cada uma com status Livre / Portador / Afetado
- **Extração assistida por IA**: ao anexar o PDF do laudo, o botão
  "Extrair com IA" (usa a API da Claude) tenta preencher laboratório, data
  e resultados automaticamente — sempre como *sugestão*, para revisão antes
  de salvar. Sem `ANTHROPIC_API_KEY` configurada, o botão simplesmente não
  funciona e o cadastro continua 100% manual
- **Painel consolidado**: por condição, mostra o resultado mais recente
  entre todos os laudos anexados
- **Herança preditiva ("Cleared by Parentage")**: se pai e mãe são livres
  para uma condição, o filhote aparece como livre por herança mesmo sem
  teste direto, com essa origem explicitada na tabela

Em `/dashboard/criador/cruzamentos`, o **Simulador de cruzamento** compara
dois cães do plantel e estima, condição a condição, o risco genético da
ninhada (nenhum / baixo / moderado / alto), com uma explicação em texto
para cada nível.

> A extração por IA usa `model: "claude-sonnet-5"`. Se ao testar você
> receber erro de modelo inválido (a API muda modelos disponíveis com o
> tempo), veja a lista atual em https://docs.claude.com/en/docs/about-claude/models
> e ajuste em `src/lib/anthropic.ts`.

## 6. Fase 3 — Dashboard do Ciclo de Vida

### Financeiro
- Em `/dashboard/criador/financeiro`: visão geral de receitas, despesas e
  saldo do canil, com lançamentos gerais ou vinculados a um cão específico
- Na ficha de cada cão: seção **Financeiro** com o mesmo tipo de lançamento,
  já filtrado para aquele cão (ex: veterinário do padreador X, venda do
  filhote Y)

### Ciclo reprodutivo e ninhadas
- Na ficha de uma fêmea: seção **Ciclo reprodutivo**, onde você registra o
  início de cada cio. A partir do segundo registro, o sistema estima a data
  do próximo cio pela média dos intervalos observados (antes disso, usa uma
  estimativa padrão de 6 meses, deixada explícita na tela)
- Seção **Ninhadas**: ao registrar uma cobertura (com um padreador do
  plantel ou de outro canil), a **data prevista de parto é calculada
  automaticamente** (63 dias depois). Quando o parto acontece, basta
  clicar em "Registrar parto" e informar a data real e a quantidade de
  filhotes
- Em `/dashboard/criador/ninhadas`: todas as ninhadas do canil, previstas
  e já nascidas

## 8. Fase 4 — Dossiê Genético (Passaporte Digital)

Na ficha de cada cão, a seção **Dossiê genético**:

- Ao clicar em "Gerar dossiê genético", o sistema calcula o **COI**
  (coeficiente de endogamia) a partir da árvore genealógica cadastrada, e
  cria um link público compartilhável (desligado por padrão)
- "Publicar link público" liga/desliga a visibilidade externa — enquanto
  estiver desligado, o link não existe para ninguém de fora
- O link público (`/dossie/[slug]`) não exige login e mostra: genealogia
  resumida (pais e avós), COI, o **painel de saúde** (semáforo de status
  genético, incluindo herança preditiva) e um texto jurídico padrão de
  isenção de responsabilidade

### Sobre o cálculo do COI
O COI é uma **estimativa**, não um cálculo certificado por uma entidade de
registro: ele assume que os próprios ancestrais comuns não são endogâmicos
(simplificação padrão quando não se tem a árvore completa de todos eles),
enxerga só até 6 gerações, e depende inteiramente dos dados de pai/mãe que
o criador cadastrou no plantel. A lógica está isolada em
`src/lib/pedigree.ts`, comentada em detalhe, caso queira ajustar a
profundidade de gerações ou a fórmula.

## 10. Fase 5 — Motor de Precificação Dinâmica

Em `/dashboard/criador/precificacao`: configure a faixa de preço
**mínimo / médio / máximo** por porte (Anão, Pequeno, Médio, ou qualquer
outro que você já use no cadastro de cães). Sem configuração, o sistema usa
valores de referência genéricos só para não começar em zero — ajuste para
a realidade do seu canil e da sua região.

Na ficha de cada cão, a seção **Precificação sugerida** mostra uma faixa
mínimo/ideal/teto, calculada a partir de:
- **Saúde genética** (40% do peso): proporção de condições Livres vs.
  Portador/Afetado no painel de saúde
- **Endogamia** (30% do peso): quanto menor o COI, melhor o score
- **Documentação** (30% do peso): ter pedigree anexado e dossiê publicado

### Limitação importante, por design
Esta fase **ainda não usa dados reais de oferta e demanda** — o
Marketplace (Fase 6) e o Radar de Demanda (Fase 8) é que vão alimentar
esse mesmo motor com sinais de mercado de verdade (quantos filhotes
parecidos estão à venda, tempo médio de venda, etc.). Por enquanto, o
"preço ideal" reflete só a qualidade do cão dentro da faixa que você
mesmo definiu. A lógica está isolada em `src/lib/precificacao.ts`, para
ser estendida sem reescrever nada quando os dados de mercado chegarem.

## 12. Fase 6 — Marketplace público

### Modo invite-only
Todo canil nasce **não verificado**. Só canis verificados aparecem no
marketplace público e só eles podem receber avaliações. A aprovação é
manual, em `/admin` (visível para usuários com papel ADMIN) — para testar,
promova seu próprio usuário a ADMIN direto no banco (`npm run db:studio`,
tabela `User`, campo `role`), aprove seu canil, e então os anúncios
publicados aparecem em `/marketplace`.

### Lado do criador
- `/dashboard/criador/anuncios`: criar anúncio a partir de um cão do
  plantel, com **preço pré-preenchido pela sugestão da Fase 5** ao
  selecionar o cão
- Página de cada anúncio: alterar status (rascunho / publicado / pausado /
  vendido), preço e tipo (gratuito/premium — o destaque "premium" já existe
  no anúncio, mas a cobrança em si só chega na Fase 9), upload de fotos
  (mesma ressalva de `public/uploads` da Fase 1 — troque por S3/R2 antes de
  produção), e as mensagens de interesse recebidas
- `/dashboard/criador/mensagens`: todas as mensagens recebidas em todos os
  anúncios, num só lugar

### Lado público
- `/marketplace`: vitrine com filtro por porte, sexo e preço máximo,
  mostrando só anúncios publicados de canis verificados
- `/marketplace/[id]`: detalhe do anúncio, com link para o Dossiê Genético
  (Fase 4) quando publicado, e formulário de "Tenho interesse" (sem exigir
  login — vira uma mensagem na caixa de entrada do criador)
- `/canil/[slug]`: perfil público do canil, com seus anúncios publicados e
  avaliações por estrelas (para avaliar, é preciso estar logado como
  comprador)

### O que ainda não é
As mensagens de interesse são uma caixa de entrada simples, não um chat em
tempo real — isso é o que a Fase 7 (Radar de Demanda) constrói em cima
disso, com matchmaking e double opt-in.

## 14. Fase 7 — Radar de Demanda / Fila de Espera Reversa

### Lado do comprador
Em `/dashboard/comprador/radar`: o comprador descreve o que procura (porte,
sexo, preço máximo, cor, estado) e informa um **WhatsApp obrigatório** —
essa é a validação anti-fraude desta fase. O CPF é opcional e, se
informado, tem o **formato validado de verdade** (dígitos verificadores),
em `src/lib/cpf.ts`.

> Não há verificação real de posse do WhatsApp/CPF (isso exigiria um
> serviço pago tipo Twilio ou Zenvia para enviar um código por SMS). O que
> existe é validação de formato — suficiente para barrar digitação errada
> e números óbvios como "111.111.111-11", mas não prova que o número
> pertence a quem o informou.

A partir do desejo salvo, a página já lista os anúncios publicados
compatíveis, com um botão "Tenho interesse".

### Double opt-in ("Concierge")
Quando o comprador clica em "Tenho interesse", isso cria um **Match** —
mas o WhatsApp dele só é revelado ao criador (e o contato do criador só é
revelado ao comprador) depois que o **criador também aceita**, na página
do anúncio (`/dashboard/criador/anuncios/[id]`, seção "Radar de demanda —
interessados"). Nenhum dos dois lados vê o contato do outro antes disso.

### Denúncia de lead
Tanto uma mensagem de contato (Fase 6) quanto um match do radar podem ser
denunciados pelo criador, direto na tela — a lista de denúncias fica
visível para revisão em `/admin`.

## 16. Fase 8 — Módulo de Inteligência de Mercado (camada PRO)

Em `/dashboard/criador/mercado`:
- **Demanda vs. oferta por porte** (gráfico): cruza os desejos ativos do
  Radar de Demanda (Fase 7) com os anúncios publicados (Fase 6)
- **Tendências de busca**: por porte, quantos desejos ativos existem,
  preço médio desejado, e se o mercado está aquecido, parado ou
  equilibrado
- **Relatório de liquidez**: por porte, quantos anúncios já venderam,
  preço médio de venda e tempo médio até vender (usa a mudança de status
  para VENDIDO como proxy da data da venda)

### Isto é a camada PRO
O acesso é controlado pelo campo `Canil.assinaturaPro`. Sem cobrança
implementada ainda (isso é a Fase 9), um admin ativa manualmente em
`/admin`, ao lado do botão de verificação do canil.

### A promessa da Fase 5 agora está cumprida
Quando `assinaturaPro` está ativo, a seção "Precificação sugerida" na
ficha de cada cão passa a ajustar o preço ideal com o **fator de mercado
real** (demanda vs. oferta daquele porte), além da qualidade genética já
calculada — a lógica está em `ajustarFaixaPorMercado()`, em
`src/lib/precificacao.ts`. Sem o PRO, a sugestão continua exatamente como
na Fase 5 (só qualidade, sem dados de mercado).

## 18. Fase 9 — Transações, Comissões e Assinaturas

Integração real com o **Mercado Pago (Checkout Pro)**: o servidor nunca
lida com dado de cartão — cria uma "preferência" de pagamento e redireciona
o usuário para o checkout hospedado pelo Mercado Pago. A confirmação
definitiva sempre vem por **webhook** (`/api/webhooks/mercadopago`), nunca
no retorno do navegador — é assim que se evita liberar um benefício antes
do pagamento realmente cair.

### O que passa a ser cobrado
- **Assinatura PRO** (R$ 49,90/mês): em `/dashboard/criador/mercado`,
  botão "Assinar PRO" — ativa `Canil.assinaturaPro` quando o pagamento é
  aprovado
- **Destaque Premium de anúncio** (R$ 29,90, pagamento único): na página
  de cada anúncio — o `tipo` só vira `PREMIUM` depois do pagamento
  aprovado; não dá mais para setar isso direto pela edição do anúncio
- **Comissão de venda** (5% do preço do anúncio): gerada automaticamente
  quando o criador marca um anúncio como "Vendido"; aparece na página do
  anúncio com botão para pagar

### Configuração necessária
```bash
MERCADOPAGO_ACCESS_TOKEN="seu-access-token"
MERCADOPAGO_WEBHOOK_SECRET="seu-segredo-de-webhook"
```
Pegue o Access Token em
https://www.mercadopago.com.br/developers/panel, e configure o webhook
apontando para `https://SEU-DOMINIO/api/webhooks/mercadopago` em "Suas
integrações" > Webhooks — de lá também sai o `MERCADOPAGO_WEBHOOK_SECRET`.

**Sem essas chaves configuradas**, os botões de pagamento mostram um erro
claro ("pagamentos ainda não configurados") em vez de travar a aplicação —
e o admin ainda pode ativar o PRO manualmente em `/admin` para continuar
testando o resto do sistema sem depender do Mercado Pago.

### Sobre o webhook sem segredo configurado
Se `MERCADOPAGO_WEBHOOK_SECRET` não estiver definido, o webhook aceita
notificações sem validar a assinatura (só para não travar testes locais) —
isso **não é seguro para produção**. Configure o segredo antes de ir ao
ar de verdade; o código já valida a assinatura corretamente quando ele
existe (`src/lib/mercadopago.ts`).

## 20. Fase 10 — Growth e Operação

### Sistema de convites
Em `/dashboard/criador/convites`, canis **já verificados** geram códigos
de convite (link `/register?convite=CODIGO`). Quem se cadastra como
criador usando um código válido **já nasce verificado**, sem passar pela
fila de aprovação manual — é a "fase 2" do invite-only mencionada desde a
Fase 6.

### Fila de aprovação pública (fase 3 do invite-only)
Em `/dashboard/criador/verificacao`, qualquer criador (mesmo sem convite)
preenche dados do canil — descrição, cidade/estado, telefone, Instagram —
e solicita verificação. Isso registra `solicitacaoVerificacaoEm`, e o
canil sobe para o topo da fila em `/admin`, ordenada por quem pediu há
mais tempo. Continua sendo aprovação manual, mas agora com contexto para
o admin decidir mais rápido, e sem exigir convite de ninguém.

### Moderação
Além das denúncias de lead (Fase 7), o admin agora pode **ocultar
avaliações** falsas/spam sem apagar o histórico (`/admin`, seção
"Avaliações recentes") — uma avaliação oculta some da página pública do
canil e não entra mais na nota média, mas fica registrada para auditoria.

### Analytics gerais
Em `/admin/analytics`: usuários por papel, canis verificados vs.
pendentes, cães cadastrados, GMV (soma do que já foi vendido), receita
real da plataforma (soma dos pagamentos aprovados, por tipo), anúncios
por status — os números que fecham o círculo de tudo o que foi construído
nas fases anteriores.

## 22. Ajustes: foto do cão, layout em abas e genética de cor

Quatro ajustes pedidos depois do roadmap original, todos só na ficha
individual do cão (não mudam as dashboards do canil):

**1. Foto no card do plantel** — `Cao.fotoUrl`, upload direto na aba
"Dados Gerais" da ficha (clique na caixa de imagem), já aparece na
listagem do plantel.

**2. Ficha do cão em abas** — Dados Gerais, Árvore Genealógica, Genética,
Financeiro, Dossiê, Precif., Gav. Digi. Troca de aba é só client-side (os
dados de todas as abas já vêm carregados de uma vez do servidor, sem
recarregar a página). Componente genérico em `src/components/tabs.tsx`.

**3. Fenótipo de cor no formulário do cão** — campos novos: Cor Base,
Marcação, Cor da Trufa, Diluição, Merle, Intensidade da Cor, Cores já
Produzidas. Também é possível informar o genótipo de um exame de DNA de
cor (painel tipo Embark) por lócus, se o criador tiver.

**4. Motor de genética de cor** (`src/lib/genetica-cor.ts`) — sistema novo
e separado do `LaudoGenetico` de saúde (Fase 2). Modela os lócus B, E, K,
A, D, S, M, I do documento de referência fornecido, com:
- **Inferência de genótipo a partir do fenótipo**, quando não há exame de
  DNA — ex: um cão Chocolate é sempre `b/b`; um cão Preto sem histórico é
  presumido `B/B` (não portador), mas se ele já produziu um filhote
  Chocolate, o sistema promove automaticamente para `B/b`
- **Cruzamento mendeliano completo** entre dois cães (Simulador de
  Cruzamento), combinando os 8 lócus e retornando a distribuição de cores
  possíveis na ninhada com probabilidade de cada uma
- **Alertas da raça**: Double Merle (crítico), Merle Fantasma (atenção),
  Diluição/CDA (informativo) — direto das "regras de ouro" do documento

### Simplificação importante, documentada no código e na tela
Sem exame de DNA e sem evidência de portador (filhote ou ancestral com a
característica), o motor presume que o cão **não carrega** o alelo
recessivo — é a prática padrão de calculadoras de cor caninas, mas não é
certeza genética. Isso fica marcado como "Presumido (sem evidência de
portador)" em toda a interface, para não passar uma confiança que os
dados não sustentam.

### O que não foi modelado em detalhe
O documento de referência cita algumas variações sem regra genética
fechada — Beaver, Máscara (Em), Harlequin, Branco Extremo, trufa "Carne".
Elas continuam disponíveis como opção no formulário (afinal são fenótipos
reais), mas o motor de inferência não tenta adivinhar o lócus exato para
elas — evita inventar uma regra que não está documentada. Se você tiver
uma referência mais específica para esses casos, é só me passar que eu
incorporo.

## 23. Próximos passos possíveis

Com o roadmap original completo e esses ajustes de genética de cor no
lugar, os caminhos naturais a partir daqui são: (1) rodar tudo localmente
pela primeira vez e validar o fluxo ponta a ponta, (2) refinar alguma
fase específica com mais profundidade, ou (3) abrir a discussão para
funcionalidades além do plano inicial.

> Nota sobre este ambiente: não consegui rodar `prisma generate` neste
> sandbox porque ele bloqueia o domínio `binaries.prisma.sh`, usado para
> baixar o engine do Prisma. É uma restrição só deste ambiente de
> construção — no seu computador ou na Vercel, com internet normal, o
> `npm install` resolve isso sozinho.
