-- ============================================================
-- Oficina Mecânica — Schema Multi-Tenant (reset completo)
-- Rodar no SQL Editor do Supabase
-- ============================================================

-- 1. DROP tudo na ordem certa
DROP TABLE IF EXISTS mensagens CASCADE;
DROP TABLE IF EXISTS conversas CASCADE;
DROP TABLE IF EXISTS avarias CASCADE;
DROP TABLE IF EXISTS os_itens CASCADE;
DROP TABLE IF EXISTS ordens_servico CASCADE;
DROP TABLE IF EXISTS servicos CASCADE;
DROP TABLE IF EXISTS veiculos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS oficinas CASCADE;

DROP FUNCTION IF EXISTS current_oficina_id CASCADE;
DROP FUNCTION IF EXISTS fill_oficina_id CASCADE;
DROP FUNCTION IF EXISTS set_oficina_claim CASCADE;
DROP FUNCTION IF EXISTS recalcular_total_os CASCADE;
DROP FUNCTION IF EXISTS get_cliente_portal CASCADE;
DROP FUNCTION IF EXISTS get_conversa_by_token CASCADE;
DROP FUNCTION IF EXISTS send_message_cliente CASCADE;

-- ============================================================
-- 2. OFICINAS
-- ============================================================
CREATE TABLE oficinas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  phone      text,
  address    text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. PERFIS (admin/mecânico) — ligados a auth.users + oficina
-- ============================================================
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  oficina_id  uuid NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'mecanico' CHECK (role IN ('admin', 'mecanico')),
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 4. FUNÇÃO HELPER — oficina_id do usuário logado via JWT
-- ============================================================
CREATE OR REPLACE FUNCTION current_oficina_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'oficina_id')::uuid
$$;

-- ============================================================
-- 5. TRIGGER — injeta oficina_id no JWT ao criar/atualizar perfil
-- ============================================================
CREATE OR REPLACE FUNCTION set_oficina_claim()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('oficina_id', NEW.oficina_id::text)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_upsert
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_oficina_claim();

-- ============================================================
-- 6. TABELAS DE DADOS
-- ============================================================
CREATE TABLE clientes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id     uuid NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  name           text NOT NULL,
  phone          text,
  email          text,
  document       text,
  notes          text,
  cliente_token  uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE veiculos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id  uuid NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  cliente_id  uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  marca       text NOT NULL,
  modelo      text NOT NULL,
  ano         integer,
  placa       text,
  cor         text,
  km_entrada  integer,
  notes       text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE servicos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id   uuid NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  nome         text NOT NULL,
  descricao    text,
  preco_padrao numeric(10,2),
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE ordens_servico (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id        uuid NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  cliente_id        uuid REFERENCES clientes(id) ON DELETE SET NULL,
  veiculo_id        uuid REFERENCES veiculos(id) ON DELETE SET NULL,
  numero            serial,
  titulo            text NOT NULL,
  status            text NOT NULL DEFAULT 'aberta'
                      CHECK (status IN ('aberta','em_andamento','aguardando_peca','pronta','entregue','cancelada')),
  km_entrada        integer,
  km_saida          integer,
  previsao_entrega  date,
  valor_total       numeric(10,2) NOT NULL DEFAULT 0,
  observacoes       text,
  criado_por        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TABLE os_itens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id           uuid NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  oficina_id      uuid NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  tipo            text NOT NULL CHECK (tipo IN ('servico','peca')),
  descricao       text NOT NULL,
  quantidade      integer NOT NULL DEFAULT 1,
  preco_unitario  numeric(10,2) NOT NULL,
  subtotal        numeric(10,2) NOT NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE avarias (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id       uuid NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  oficina_id  uuid NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  descricao   text NOT NULL,
  foto_url    text,
  momento     text NOT NULL DEFAULT 'entrada' CHECK (momento IN ('entrada','saida')),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE conversas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oficina_id  uuid NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
  cliente_id  uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  os_id       uuid REFERENCES ordens_servico(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE mensagens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id  uuid NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  sender_id    uuid,
  sender_type  text NOT NULL CHECK (sender_type IN ('staff','cliente')),
  content      text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- 7. TRIGGER — preenche oficina_id automaticamente nos inserts
-- ============================================================
CREATE OR REPLACE FUNCTION fill_oficina_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE oid uuid;
BEGIN
  oid := current_oficina_id();
  IF oid IS NOT NULL THEN
    NEW.oficina_id := oid;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_oid_clientes      BEFORE INSERT ON clientes       FOR EACH ROW EXECUTE FUNCTION fill_oficina_id();
CREATE TRIGGER auto_oid_veiculos      BEFORE INSERT ON veiculos       FOR EACH ROW EXECUTE FUNCTION fill_oficina_id();
CREATE TRIGGER auto_oid_servicos      BEFORE INSERT ON servicos       FOR EACH ROW EXECUTE FUNCTION fill_oficina_id();
CREATE TRIGGER auto_oid_ordens        BEFORE INSERT ON ordens_servico FOR EACH ROW EXECUTE FUNCTION fill_oficina_id();
CREATE TRIGGER auto_oid_os_itens      BEFORE INSERT ON os_itens       FOR EACH ROW EXECUTE FUNCTION fill_oficina_id();
CREATE TRIGGER auto_oid_avarias       BEFORE INSERT ON avarias        FOR EACH ROW EXECUTE FUNCTION fill_oficina_id();
CREATE TRIGGER auto_oid_conversas     BEFORE INSERT ON conversas      FOR EACH ROW EXECUTE FUNCTION fill_oficina_id();

-- ============================================================
-- 8. RLS
-- ============================================================
ALTER TABLE oficinas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico  ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_itens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE avarias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens       ENABLE ROW LEVEL SECURITY;

-- Staff (authenticated) — acesso à própria oficina
CREATE POLICY "own_oficina"   ON oficinas       FOR SELECT TO authenticated USING (id = current_oficina_id());
CREATE POLICY "same_oficina"  ON profiles       FOR ALL    TO authenticated USING (oficina_id = current_oficina_id()) WITH CHECK (oficina_id = current_oficina_id());
CREATE POLICY "same_oficina"  ON clientes       FOR ALL    TO authenticated USING (oficina_id = current_oficina_id()) WITH CHECK (oficina_id = current_oficina_id());
CREATE POLICY "same_oficina"  ON veiculos       FOR ALL    TO authenticated USING (oficina_id = current_oficina_id()) WITH CHECK (oficina_id = current_oficina_id());
CREATE POLICY "same_oficina"  ON servicos       FOR ALL    TO authenticated USING (oficina_id = current_oficina_id()) WITH CHECK (oficina_id = current_oficina_id());
CREATE POLICY "same_oficina"  ON ordens_servico FOR ALL    TO authenticated USING (oficina_id = current_oficina_id()) WITH CHECK (oficina_id = current_oficina_id());
CREATE POLICY "same_oficina"  ON os_itens       FOR ALL    TO authenticated USING (oficina_id = current_oficina_id()) WITH CHECK (oficina_id = current_oficina_id());
CREATE POLICY "same_oficina"  ON avarias        FOR ALL    TO authenticated USING (oficina_id = current_oficina_id()) WITH CHECK (oficina_id = current_oficina_id());
CREATE POLICY "same_oficina"  ON conversas      FOR ALL    TO authenticated USING (oficina_id = current_oficina_id()) WITH CHECK (oficina_id = current_oficina_id());
CREATE POLICY "same_oficina"  ON mensagens      FOR ALL    TO authenticated
  USING (conversa_id IN (SELECT id FROM conversas WHERE oficina_id = current_oficina_id()))
  WITH CHECK (conversa_id IN (SELECT id FROM conversas WHERE oficina_id = current_oficina_id()));

-- ============================================================
-- 9. RPC — recalcular total da OS
-- ============================================================
CREATE OR REPLACE FUNCTION recalcular_total_os(p_os_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE ordens_servico
  SET valor_total = COALESCE((
    SELECT SUM(subtotal) FROM os_itens WHERE os_id = p_os_id
  ), 0),
  updated_at = now()
  WHERE id = p_os_id;
END;
$$;

-- ============================================================
-- 10. RPCs — acesso do cliente via token (sem autenticação)
-- ============================================================

-- Retorna dados completos do portal do cliente
CREATE OR REPLACE FUNCTION get_cliente_portal(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cliente  clientes%ROWTYPE;
  v_oficina  oficinas%ROWTYPE;
  v_result   jsonb;
BEGIN
  SELECT * INTO v_cliente FROM clientes WHERE cliente_token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Token inválido');
  END IF;

  SELECT * INTO v_oficina FROM oficinas WHERE id = v_cliente.oficina_id LIMIT 1;

  SELECT jsonb_build_object(
    'cliente', row_to_json(v_cliente),
    'oficina', row_to_json(v_oficina),
    'veiculos', (
      SELECT jsonb_agg(row_to_json(v))
      FROM veiculos v
      WHERE v.cliente_id = v_cliente.id
    ),
    'ordens', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'os', row_to_json(os),
          'itens', (
            SELECT jsonb_agg(row_to_json(i)) FROM os_itens i WHERE i.os_id = os.id
          ),
          'avarias', (
            SELECT jsonb_agg(row_to_json(a)) FROM avarias a WHERE a.os_id = os.id
          )
        )
      )
      FROM ordens_servico os
      WHERE os.cliente_id = v_cliente.id
        AND os.status NOT IN ('cancelada')
      ORDER BY os.created_at DESC
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Retorna conversas do cliente via token
CREATE OR REPLACE FUNCTION get_conversa_by_token(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cliente clientes%ROWTYPE;
BEGIN
  SELECT * INTO v_cliente FROM clientes WHERE cliente_token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Token inválido');
  END IF;

  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'conversa', row_to_json(c),
        'mensagens', (
          SELECT jsonb_agg(row_to_json(m) ORDER BY m.created_at ASC)
          FROM mensagens m WHERE m.conversa_id = c.id
        )
      )
    )
    FROM conversas c
    WHERE c.cliente_id = v_cliente.id
  );
END;
$$;

-- Envia mensagem como cliente (sem autenticação)
CREATE OR REPLACE FUNCTION send_message_cliente(
  p_token       uuid,
  p_conversa_id uuid,
  p_content     text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cliente clientes%ROWTYPE;
  v_msg     mensagens%ROWTYPE;
BEGIN
  SELECT * INTO v_cliente FROM clientes WHERE cliente_token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Token inválido');
  END IF;

  -- Verificar que a conversa pertence ao cliente
  IF NOT EXISTS (
    SELECT 1 FROM conversas
    WHERE id = p_conversa_id AND cliente_id = v_cliente.id
  ) THEN
    RETURN jsonb_build_object('error', 'Conversa não encontrada');
  END IF;

  INSERT INTO mensagens (conversa_id, sender_id, sender_type, content)
  VALUES (p_conversa_id, NULL, 'cliente', p_content)
  RETURNING * INTO v_msg;

  RETURN row_to_json(v_msg)::jsonb;
END;
$$;

-- ============================================================
-- 11. CADASTRO DE NOVA OFICINA + ADMIN
-- Template para usar ao vender para um novo cliente:
--
-- BEGIN;
--   INSERT INTO oficinas (name, slug, phone, address)
--   VALUES ('Oficina Silva', 'oficina-silva', '(11) 99999-9999', 'Rua X, 123') RETURNING id;
--   -- Anotar o UUID retornado como <oficina_id>
--   -- Criar usuário no Auth dashboard e anotar como <user_id>
--   INSERT INTO profiles (id, oficina_id, name, email, role)
--   VALUES ('<user_id>', '<oficina_id>', 'João Silva', 'joao@oficina.com', 'admin');
--   -- O trigger set_oficina_claim injeta o oficina_id no JWT automaticamente.
-- COMMIT;
-- ============================================================
