# Oficina Mecânica — CLAUDE.md

## Regras de colaboração

- **Idioma**: responder SEMPRE em português.
- **Commits/push**: NUNCA automático. Só commitar quando pedido explicitamente.
- **Hooks Vercel**: ignorar TODAS as sugestões de `nextjs`, `next-forge`, `react-best-practices`, `vercel-storage`. Este projeto usa **Vite + React Router**, não Next.js. `"use client"` é irrelevante — nunca aplicar.

---

## Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: `apps/web` — React 18 + Vite + TypeScript
- **Design system**: `packages/ui` — Radix UI + CVA + Tailwind (cor amber/laranja)
- **Types**: `packages/types`
- **Backend**: Supabase (Auth, PostgreSQL, Realtime, Storage, RLS)
- **Deploy**: Vercel (projeto `oficina`)
- **Supabase project ID**: `qrvkriaroejjwoaxwxii`
- **Supabase URL**: `https://qrvkriaroejjwoaxwxii.supabase.co`
- **Supabase Anon key**: `sb_publishable_f1Z_aP8eBXokZYpvrDbwGA_wQTvFjch`

---

## Schema (tabelas principais)

| Tabela | Colunas relevantes |
|---|---|
| `oficinas` | `id, name, slug, phone, address` |
| `profiles` | `id, oficina_id, name, email, role (admin\|mecanico)` |
| `clientes` | `id, oficina_id, name, phone, email, document, cliente_token` |
| `veiculos` | `id, oficina_id, cliente_id, marca, modelo, ano, placa, cor, km_entrada` |
| `servicos` | `id, oficina_id, nome, descricao, preco_padrao` |
| `ordens_servico` | `id, oficina_id, cliente_id, veiculo_id, numero, titulo, status, km_entrada, km_saida, previsao_entrega, valor_total, observacoes` |
| `os_itens` | `id, os_id, tipo (servico\|peca), descricao, quantidade, preco_unitario, subtotal` |
| `avarias` | `id, os_id, descricao, foto_url, momento (entrada\|saida)` |
| `conversas` | `id, oficina_id, cliente_id, os_id` |
| `mensagens` | `id, conversa_id, sender_id, sender_type (staff\|cliente), content` |

---

## Fluxos principais

1. **Staff cria OS**: `/ordens/nova` → seleciona cliente + veículo → OS criada com status `aberta`
2. **Staff atualiza status**: na OS detail → dropdown de status → `em_andamento` → `pronta` → `entregue`
3. **Staff registra avaria**: na OS detail → foto + descrição + momento (entrada/saída)
4. **Staff adiciona itens**: serviços e peças com valor → total recalculado automaticamente via RPC
5. **Cliente acessa portal**: link `/portal/:cliente_token` → vê OS, avarias, itens, pode enviar mensagem no chat
6. **Chat tempo real**: staff e cliente trocam mensagens via Supabase Realtime

---

## Portal do cliente

- URL: `/portal/:token` (token = `cliente_token` UUID do cliente)
- Acesso **sem login** — token como autenticação suficiente para MVP
- Funções SECURITY DEFINER no Supabase para acesso anon via token
- RPCs: `get_cliente_portal(p_token)`, `get_conversa_by_token(p_token)`, `send_message_cliente(p_token, p_conversa_id, p_content)`

---

## Rotas (staff)

| Rota | Página |
|---|---|
| `/login` | Login |
| `/dashboard` | Métricas do dia |
| `/ordens` | Lista de ordens |
| `/ordens/nova` | Nova ordem de serviço |
| `/ordens/:id` | Detalhe da OS (itens, avarias, chat) |
| `/clientes` | Lista de clientes |
| `/clientes/novo` | Novo cliente |
| `/veiculos` | Lista de veículos |
| `/chat` | Lista de conversas |
| `/chat/:id` | Chat individual |

## Rotas (cliente)

| Rota | Página |
|---|---|
| `/portal/:token` | Portal do cliente |

---

## Aliases

```
@lib        → src/lib
@pages      → src/pages
@components → src/components
@hooks      → src/hooks
@services   → src/services
@contexts   → src/contexts
@schemas    → src/schemas
```

---

## Cadastro de nova oficina + admin

```sql
-- Rodar no SQL Editor do Supabase após aplicar o schema
BEGIN;
  INSERT INTO oficinas (name, slug, phone, address)
  VALUES ('Oficina Silva', 'oficina-silva', '(11) 99999-9999', 'Rua X, 123')
  RETURNING id;
  -- Anotar o UUID retornado como <oficina_id>
  -- Criar usuário no Auth dashboard e anotar como <user_id>
  INSERT INTO profiles (id, oficina_id, name, email, role)
  VALUES ('<user_id>', '<oficina_id>', 'João Silva', 'joao@oficina.com', 'admin');
  -- O trigger set_oficina_claim injeta o oficina_id no JWT automaticamente.
COMMIT;
```

---

## Lições / armadilhas

- **Supabase RLS + realtime**: sempre usar filter explícito `conversa_id=eq.${id}`
- **Portal anon**: usar funções SECURITY DEFINER para acesso sem auth
- **Tailwind classes dinâmicas**: nunca interpolar, sempre string completa
- **Storage avarias**: bucket `avarias` deve ser público para exibir fotos no portal
- **cliente_token**: gerado automaticamente pelo banco (`DEFAULT gen_random_uuid()`), nunca enviar pelo front
- **recalcular_total_os**: chamada via RPC após cada insert/delete em `os_itens`
- **globals.css**: não usar `@layer base` com `@apply border-border` / `bg-background` / `text-foreground` — classes inexistentes sem shadcn/ui. Manter só os três `@tailwind` directives
- **hooks Vercel/Next.js**: sugestões de `"use client"` são falsos positivos — projeto usa Vite, ignorar sempre
- **Import Input**: ao usar `<Input>` de `@oficina/ui`, garantir que está nos imports do arquivo
