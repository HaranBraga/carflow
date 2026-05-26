# CarFlow ERP — Sistema de Gestão para Lava-Jato

## Stack
- **Frontend/Backend:** Next.js 15 (App Router) + TypeScript
- **Banco de dados:** PostgreSQL via Prisma 5 ORM
- **Auth:** NextAuth v5 (JWT)
- **UI:** Tailwind CSS + Radix UI (shadcn-style)
- **WhatsApp:** Evolution API
- **Clima:** OpenWeather API
- **Deploy:** Docker / Easypanel

---

## Início rápido (desenvolvimento)

### 1. Pré-requisitos
- Node.js 20+
- PostgreSQL rodando (local ou via Docker)
- Conta OpenWeather API (gratuita)
- Instance Evolution API (opcional, para WhatsApp)

### 2. Configurar ambiente
```bash
cp .env.example .env
# Edite o .env com suas credenciais
```

### 3. Banco de dados
```bash
# Subir PostgreSQL com Docker (se não tiver local)
docker run -d --name carflow_db \
  -e POSTGRES_USER=carflow \
  -e POSTGRES_PASSWORD=carflow_secret \
  -e POSTGRES_DB=carflow_db \
  -p 5432:5432 postgres:16-alpine

# Criar tabelas
npm run db:migrate

# Gerar cliente Prisma
npm run db:generate

# Popular com dados iniciais
npm run db:seed
```

### 4. Rodar o projeto
```bash
npm install
npm run dev
```

Acesse: http://localhost:3000
- **Empresa:** `default`
- **Email:** `admin@carflow.com`
- **Senha:** `admin123`

---

## Deploy no Easypanel

### Opção A — Docker Compose (recomendado para VPS própria)
```bash
# Configure as variáveis no docker-compose.yml
docker-compose up -d

# Primeira vez — migrar banco e fazer seed
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx ts-node prisma/seed.ts
```

### Opção B — Easypanel (painel gráfico)
1. Crie um projeto no Easypanel
2. Adicione um serviço **PostgreSQL** → copie a `DATABASE_URL`
3. Adicione um serviço **App** → conecte ao repositório GitHub
4. Configure as variáveis de ambiente (veja `easypanel.yml`)
5. No terminal do app: `npx prisma migrate deploy && npx ts-node prisma/seed.ts`

---

## Módulos

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Dashboard | `/dashboard` | Resumo do dia (carros, receita, lucro) |
| Entrada | `/dashboard/entrada` | Receber veículo (placa, cliente, serviços, checklist) |
| Lavagem | `/dashboard/lavagem` | Painel em tempo real + botão WhatsApp |
| Caixa | `/dashboard/caixa` | Fluxo de caixa do dia (receitas/despesas) |
| Lavadores | `/dashboard/lavadores` | Cadastro e pagamento de diária |
| CRM | `/dashboard/clientes` | Clientes, ranking, gênero, ticket médio |
| Serviços | `/dashboard/servicos` | Catálogo de serviços e preços |
| Feedback | `/dashboard/feedback` | QR codes únicos + avaliações recebidas |
| Clima | `/dashboard/previsao` | Previsão 5 dias + dicas para o lava-jato |

---

## APIs disponíveis

```
GET/POST   /api/clientes       — CRUD de clientes
GET/POST   /api/veiculos       — CRUD de veículos (busca por placa)
GET/POST   /api/ordens         — Ordens de serviço
PATCH      /api/ordens/[id]    — Atualizar status da ordem
GET/POST   /api/servicos       — Catálogo de serviços
GET/POST   /api/lavadores      — Lavadores + pagamento de diária
GET/POST   /api/caixa          — Fluxo de caixa por data
GET/POST   /api/feedback       — QR codes de feedback
GET        /api/crm/ranking    — Top clientes, serviços, categorias
GET        /api/crm/genero     — Distribuição por gênero
POST       /api/whatsapp       — Enviar notificação WhatsApp
GET        /api/previsao       — Previsão do tempo atual + 5 dias
GET        /api/health         — Health check (DB conectado?)
```

---

## Fluxo de uso diário

```
1. ENTRADA:  Gerente fotografa placa → sistema busca veículo
             → vincula cliente → seleciona serviços → checklist → confirma

2. LAVAGEM:  Painel mostra todos em andamento
             → botão "Iniciar" / "Finalizar"
             → botão "Avisar no WhatsApp" envia mensagem automática

3. CAIXA:    Serviços já entram automaticamente como receita
             → Lançar despesas manualmente (produtos, aluguel, etc.)
             → Pagar lavadores via módulo Lavadores (entra como despesa)

4. FEEDBACK: Após atendimento, gerar QR code → imprimir na comanda
             → Cliente escaneia → avalia → concorre ao sorteio

5. CRM:      Ver histórico de cada cliente
             → Rankings do mês → ticket médio → análise por gênero
```

---

## Multi-tenant (preparado para futuro)

O sistema já está arquitetado para multi-tenant:
- Toda tabela tem `tenantId`
- Autenticação valida `slug` da empresa + credenciais
- No futuro, cada empresa pode ter seu próprio PostgreSQL schema ou banco completo
- Migrations são centralizadas (atualizações vão para todos)

---

## Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | ✅ | URL do PostgreSQL |
| `NEXTAUTH_SECRET` | ✅ | String secreta para JWT (mín. 32 chars) |
| `NEXTAUTH_URL` | ✅ | URL pública do app |
| `EVOLUTION_API_URL` | ⬜ | URL da sua instância Evolution (WhatsApp) |
| `EVOLUTION_API_KEY` | ⬜ | Chave da Evolution API |
| `EVOLUTION_INSTANCE` | ⬜ | Nome da instância |
| `OPENWEATHER_API_KEY` | ⬜ | Chave da OpenWeather (gratuita) |
| `OPENWEATHER_LAT` | ⬜ | Latitude da cidade |
| `OPENWEATHER_LON` | ⬜ | Longitude da cidade |
| `NEXT_PUBLIC_INSTAGRAM_URL` | ⬜ | Link do Instagram (feedback QR) |
