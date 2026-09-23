SET local check_function_bodies = off;

CREATE TABLE "public"."cultos" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "titulo"      text                     NOT NULL,
  "data"        date                     NOT NULL,
  "horario"     time without time zone   NOT NULL DEFAULT '18:00:00'::time WITHOUT time zone,
  "periodo"     text                     NOT NULL DEFAULT 'noite'::text,
  "observacoes" text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cultos_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."cultos"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."escala_itens" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "escala_id"          uuid                     NOT NULL,
  "funcao_id"          uuid                     NOT NULL,
  "voluntario_id"      uuid,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "status_confirmacao" text                     DEFAULT 'pendente'::text,
  "motivo_recusa"      text,
  CONSTRAINT "escala_itens_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."escala_itens"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."escalas" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "culto_id"   uuid                     NOT NULL,
  "status"     text                     NOT NULL DEFAULT 'publicada'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "escalas_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_culto_escala" UNIQUE (culto_id)
);

ALTER TABLE "public"."escalas"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."funcoes" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "nome"       text                     NOT NULL,
  "descricao"  text,
  "cor"        text                     DEFAULT '#2563eb'::text,
  "ativa"      boolean                  NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "funcoes_nome_key" UNIQUE (nome),
  CONSTRAINT "funcoes_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."funcoes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."indisponibilidades" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "voluntario_id" uuid                     NOT NULL,
  "data_inicio"   date                     NOT NULL,
  "data_fim"      date                     NOT NULL,
  "periodo"       text                     NOT NULL DEFAULT 'integral'::text,
  "motivo"        text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "observacao"    text,
  CONSTRAINT "check_datas" CHECK ((data_fim >= data_inicio)),
  CONSTRAINT "indisponibilidades_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."indisponibilidades"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."perfis" (
  "id"         uuid                     NOT NULL,
  "nome"       text                     NOT NULL,
  "sobrenome"  text,
  "celular"    text,
  "ativo"      boolean                  NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "avatar_url" text,
  CONSTRAINT "perfis_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."perfis"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tipos_culto" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "nome"            text                     NOT NULL,
  "dia_semana"      integer                  NOT NULL,
  "semana_mes"      integer,
  "meses_intervalo" integer                  DEFAULT 1,
  "horario"         time without time zone   NOT NULL,
  "periodo"         text                     NOT NULL,
  "ativo"           boolean                  DEFAULT true,
  "created_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "tipos_culto_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."tipos_culto"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."voluntario_funcoes" (
  "voluntario_id" uuid NOT NULL,
  "funcao_id"     uuid NOT NULL,
  CONSTRAINT "voluntario_funcoes_pkey" PRIMARY KEY (voluntario_id, funcao_id)
);

ALTER TABLE "public"."voluntario_funcoes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."voluntarios" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "nome"       text                     NOT NULL,
  "sobrenome"  text,
  "email"      text,
  "celular"    text,
  "user_id"    uuid,
  "ativo"      boolean                  NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "voluntarios_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."voluntarios"
  ENABLE ROW LEVEL SECURITY;

CREATE TYPE "public"."nivel_acesso_tipo" AS ENUM (
  'admin',
  'lider',
  'voluntario'
);

ALTER TABLE "public"."perfis"
  ADD COLUMN "nivel_acesso" public.nivel_acesso_tipo NOT NULL DEFAULT 'voluntario'::public.nivel_acesso_tipo;

CREATE OR REPLACE FUNCTION public.criar_usuario_admin (
  p_email        text,
  p_password     text,
  p_nome         text,
  p_sobrenome    text,
  p_nivel_acesso text
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions', 'pg_temp'
  AS $function$ 
DECLARE
  v_admin_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_new_user_id UUID := gen_random_uuid(); 
BEGIN
  -- 1. Trava de Segurança: Verifica se quem chamou é administrador
  SELECT EXISTS (
    SELECT 1 FROM public.perfis WHERE id = v_admin_id AND nivel_acesso = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem criar usuários.';
  END IF;
  
  -- 2. Verifica se o e-mail já existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Este e-mail já está cadastrado no sistema.';
  END IF;
  
  -- 3. Insere no sistema de autenticação (Auth)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, email_change_token_current, phone_change,
    phone_change_token, reauthentication_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_new_user_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome', p_nome, 'sobrenome', p_sobrenome, 'nivel_acesso', p_nivel_acesso),
    NOW(), NOW(),
    '', '', '', '', '', '', '', ''
  );
  
  -- 4. Cria a identidade de login
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_new_user_id, 
    json_build_object('sub', v_new_user_id, 'email', p_email)::jsonb,
    'email', 
    v_new_user_id::text, 
    NOW(), NOW(), NOW()
  );

  -- 5. Insere diretamente na tabela public.perfis (sem depender de gatilhos)
  INSERT INTO public.perfis (id, nivel_acesso, nome, sobrenome)
  VALUES (
    v_new_user_id,
    p_nivel_acesso::public.nivel_acesso_tipo,
    p_nome,
    p_sobrenome
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    nivel_acesso = EXCLUDED.nivel_acesso,
    nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome;
  
  RETURN json_build_object('success', true, 'mensagem', 'Usuário criado com sucesso!'); 
END; 
$function$;

CREATE OR REPLACE FUNCTION public.deletar_usuario_admin (
  p_user_id uuid
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth', 'pg_temp'
  AS $function$  DECLARE   v_admin_id UUID := auth.uid();   v_is_admin BOOLEAN; 
BEGIN
-- 1. Trava de Segurança: Verifica se quem chamou é administrador

SELECT EXISTS (
SELECT 1 FROM public.perfis
WHERE id = v_admin_id AND nivel_acesso = 'admin'
) 
INTO v_is_admin;
IF NOT v_is_admin
THEN RAISE EXCEPTION 'Acesso negado. Apenas administradores podem excluir usuários.';

END IF;

-- 2. Proteção: Impede o administrador de apagar a própria conta sem querer

IF p_user_id = v_admin_id
THEN RAISE EXCEPTION 'Operação bloqueada. Você não pode excluir a sua própria conta.';
END IF;

-- 3. Faxina completa (Ordem importa para não dar erro de chave)

DELETE FROM public.perfis WHERE id = p_user_id;
DELETE FROM auth.identities WHERE user_id = p_user_id;
DELETE FROM auth.users WHERE id = p_user_id;
RETURN json_build_object('success', true, 'mensagem', 'Usuário excluído com sucesso!');
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role()
  RETURNS text
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  AS $function$
DECLARE
  v_nivel TEXT;
BEGIN
  SELECT nivel_acesso::TEXT INTO v_nivel FROM public.perfis WHERE id = auth.uid();
  RETURN v_nivel;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$   SELECT EXISTS (     SELECT 1 FROM public.perfis     WHERE id = auth.uid() AND nivel_acesso = 'admin'   ); $function$;

ALTER TABLE "public"."escalas"
  ADD CONSTRAINT "escalas_culto_id_fkey" FOREIGN KEY (culto_id) REFERENCES public.cultos(id) ON DELETE CASCADE;

ALTER TABLE "public"."escala_itens"
  ADD CONSTRAINT "escala_itens_escala_id_fkey" FOREIGN KEY (escala_id) REFERENCES public.escalas(id) ON DELETE CASCADE;

ALTER TABLE "public"."escala_itens"
  ADD CONSTRAINT "escala_itens_funcao_id_fkey" FOREIGN KEY (funcao_id) REFERENCES public.funcoes(id) ON DELETE CASCADE;

ALTER TABLE "public"."perfis"
  ADD CONSTRAINT "perfis_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."voluntario_funcoes"
  ADD CONSTRAINT "voluntario_funcoes_funcao_id_fkey" FOREIGN KEY (funcao_id) REFERENCES public.funcoes(id) ON DELETE CASCADE;

ALTER TABLE "public"."escala_itens"
  ADD CONSTRAINT "escala_itens_voluntario_id_fkey" FOREIGN KEY (voluntario_id) REFERENCES public.voluntarios(id) ON DELETE SET NULL;

ALTER TABLE "public"."indisponibilidades"
  ADD CONSTRAINT "indisponibilidades_voluntario_id_fkey" FOREIGN KEY (voluntario_id) REFERENCES public.voluntarios(id) ON DELETE CASCADE;

ALTER TABLE "public"."voluntario_funcoes"
  ADD CONSTRAINT "voluntario_funcoes_voluntario_id_fkey" FOREIGN KEY (voluntario_id) REFERENCES public.voluntarios(id) ON DELETE CASCADE;

ALTER TABLE "public"."voluntarios"
  ADD CONSTRAINT "voluntarios_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "Gestão de cultos para líderes e admins" ON "public"."cultos"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.perfis p
  WHERE ((p.id = auth.uid()) AND (p.nivel_acesso = ANY (ARRAY['admin'::public.nivel_acesso_tipo, 'lider'::public.nivel_acesso_tipo]))))));

CREATE POLICY "Leitura de cultos para autenticados" ON "public"."cultos"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Gestão de itens da escala para líderes e admins" ON "public"."escala_itens"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.perfis p
  WHERE ((p.id = auth.uid()) AND (p.nivel_acesso = ANY (ARRAY['admin'::public.nivel_acesso_tipo, 'lider'::public.nivel_acesso_tipo]))))));

CREATE POLICY "Leitura de itens da escala para autenticados" ON "public"."escala_itens"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Voluntarios podem responder sua propria escala" ON "public"."escala_itens"
  FOR UPDATE
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.voluntarios v
  WHERE ((v.id = escala_itens.voluntario_id) AND (v.user_id = auth.uid())))) OR (public.get_user_role() = ANY (ARRAY['admin'::text, 'lider'::text]))));

CREATE POLICY "Gestão de escalas para líderes e admins" ON "public"."escalas"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.perfis p
  WHERE ((p.id = auth.uid()) AND (p.nivel_acesso = ANY (ARRAY['admin'::public.nivel_acesso_tipo, 'lider'::public.nivel_acesso_tipo]))))));

CREATE POLICY "Leitura de escalas para autenticados" ON "public"."escalas"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Gestão de funções apenas para líderes e admins" ON "public"."funcoes"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.perfis p
  WHERE ((p.id = auth.uid()) AND (p.nivel_acesso = ANY (ARRAY['admin'::public.nivel_acesso_tipo, 'lider'::public.nivel_acesso_tipo]))))));

CREATE POLICY "Leitura de funções para autenticados" ON "public"."funcoes"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Exclusão de indisponibilidades" ON "public"."indisponibilidades"
  FOR DELETE
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.voluntarios v
  WHERE ((v.id = indisponibilidades.voluntario_id) AND (v.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.perfis p
  WHERE ((p.id = auth.uid()) AND (p.nivel_acesso = ANY (ARRAY['admin'::public.nivel_acesso_tipo, 'lider'::public.nivel_acesso_tipo])))))));

CREATE POLICY "Inserção de indisponibilidades" ON "public"."indisponibilidades"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.voluntarios v
  WHERE ((v.id = indisponibilidades.voluntario_id) AND (v.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.perfis p
  WHERE ((p.id = auth.uid()) AND (p.nivel_acesso = ANY (ARRAY['admin'::public.nivel_acesso_tipo, 'lider'::public.nivel_acesso_tipo])))))));

CREATE POLICY "Leitura de indisponibilidades" ON "public"."indisponibilidades"
  FOR SELECT
  TO "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.voluntarios v
  WHERE ((v.id = indisponibilidades.voluntario_id) AND (v.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.perfis p
  WHERE ((p.id = auth.uid()) AND (p.nivel_acesso = ANY (ARRAY['admin'::public.nivel_acesso_tipo, 'lider'::public.nivel_acesso_tipo])))))));

CREATE POLICY "Atualização de perfis (Blindada)" ON "public"."perfis"
  FOR UPDATE
  TO "authenticated"
  USING (((auth.uid() = id) OR (public.get_user_role() = ANY (ARRAY['admin'::text, 'lider'::text]))));

CREATE POLICY "Gestão total de perfis (Blindada)" ON "public"."perfis"
  FOR ALL
  TO "authenticated"
  USING ((public.get_user_role() = ANY (ARRAY['admin'::text, 'lider'::text])));

CREATE POLICY "Leitura de perfis (Blindada)" ON "public"."perfis"
  FOR SELECT
  TO "authenticated"
  USING (((auth.uid() = id) OR (public.get_user_role() = ANY (ARRAY['admin'::text, 'lider'::text]))));

CREATE POLICY "Gestão de tipos_culto" ON "public"."tipos_culto"
  FOR ALL
  TO "authenticated"
  USING ((public.get_user_role() = ANY (ARRAY['admin'::text, 'lider'::text])));

CREATE POLICY "Leitura de tipos_culto" ON "public"."tipos_culto"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Gestão de vínculo funções para líderes e admins" ON "public"."voluntario_funcoes"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.perfis p
  WHERE ((p.id = auth.uid()) AND (p.nivel_acesso = ANY (ARRAY['admin'::public.nivel_acesso_tipo, 'lider'::public.nivel_acesso_tipo]))))));

CREATE POLICY "Leitura de vínculo funções para autenticados" ON "public"."voluntario_funcoes"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Gestão de voluntários para líderes e admins" ON "public"."voluntarios"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.perfis p
  WHERE ((p.id = auth.uid()) AND (p.nivel_acesso = ANY (ARRAY['admin'::public.nivel_acesso_tipo, 'lider'::public.nivel_acesso_tipo]))))));

CREATE POLICY "Leitura de voluntários para autenticados" ON "public"."voluntarios"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "AvatarAccess" ON "storage"."objects"
  FOR ALL
  TO "authenticated"
  USING ((bucket_id = 'avatars'::text))
  WITH CHECK ((bucket_id = 'avatars'::text));

GRANT EXECUTE ON FUNCTION "public"."criar_usuario_admin"(text, text, text, text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."deletar_usuario_admin"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_user_role"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cultos" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."escala_itens" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."escalas" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."funcoes" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."indisponibilidades" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."perfis" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tipos_culto" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."voluntario_funcoes" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."voluntarios" TO "anon", "authenticated", "postgres", "service_role";

GRANT USAGE ON TYPE "public"."nivel_acesso_tipo" TO "postgres";

