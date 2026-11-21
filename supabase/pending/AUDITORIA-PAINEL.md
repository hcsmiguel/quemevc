# Relatório de Auditoria — Painel de Administração e Gestão de Baralhos Oficiais

**Data:** 20 de Novembro de 2026  
**Projeto:** Tá na Cara! Mas de quem?!  
**Ambiente:** Supabase (ddfefbwauuhqxqufhwwr.supabase.co) / Localhost  

---

## a) Representação do Dono "Tá na Cara!" em Caras e Baralhos

- **No banco de dados (`saved_faces` e `saved_decks`):**
  - **Coluna `author_name`:** Armazena o texto literal `'Tá na Cara!'`.
  - **Coluna `is_official`:** Flag booleana `boolean DEFAULT false`. Baralhos criados pela equipe recebem `is_official = true`.
  - **Coluna `user_id`:** Não existe uma conta de sistema fixa com UUID reservado no Auth. É gravado o `user_id` do administrador que realizou a ação (ex.: o UUID de `carvalho` em `user_profiles`) ou o identificador `'admin_tanacara'`.
- **Na aplicação (cliente):**
  - A identificação é verificada por `is_official === true` ou `author_name === 'Tá na Cara!'`.
  - A diretriz de produto elimina o termo visual "oficial", consolidando a identificação pública puramente pelo dono "Tá na Cara!".

---

## b) O "Banco de Caras Oficiais"

- **Tabela:** `public.saved_faces`, filtrada por `is_official = true`.
- **Storage:** Bucket público `custom_faces`.
- **Telas que o alimentavam / listavam:**
  - `AdminOfficialFaces.tsx`: permitia criar e listar caras com flag `is_official = true`.
  - `AdminOfficialDecks.tsx`: possuía um seletor dividido em abas ("Oficiais" e "Comunidade").
  - `AdminOverview.tsx`: exibia a métrica `metrics.officialFacesCount`.
- **Quantidade de registros (leitura remota):**
  - Total em `saved_faces WHERE is_official = true`: **0** registros no banco de dados remoto no momento da auditoria.
  - Caras canônicas originais do jogo (Ana, Bruno, Carla, Davi etc.) residem em arquivos estáticos locais (`/standard-faces/*.jpg`) e em `src/utils/characters.ts` (15 personagens canônicos).
  - O bucket `custom_faces` possui **144** arquivos de imagem gravados.

---

## c) Criação de Baralhos no Painel e Restrição do Seletor

- **Fluxo anterior:**
  - O componente `AdminOfficialDecks.tsx` lia caras pré-existentes através de `adminService.getOfficialFaces()` e `auth.getPublicFaces()`.
  - O seletor exigia que uma cara já estivesse gravada e disponível em `saved_faces` para ser clicada e adicionada.
  - Não existia a possibilidade de fazer upload ou criação de novas caras em rascunho diretamente na tela do construtor de baralhos.

---

## d) Verificação do Cargo de Administrador

- **No cliente:**
  - Verificação de `currentUser?.is_admin === true` no perfil carregado a partir de `public.user_profiles`.
  - Chamadas de conferência em `auth.verifyAdminStatus()` e `adminService.verifyIsAdmin()` checando `public.user_profiles.is_admin`.
- **No servidor (Supabase Postgres):**
  - Função nativa `public.is_admin()` que verifica se `user_profiles.is_admin = true` para o `auth.uid()`.
  - Políticas RLS existentes concedem privilégios totais (`ALL`) para administradores em `saved_decks` e `saved_faces`.
  - **Vulnerabilidade identificada no schema atual:** As políticas públicas permissivas (`WITH CHECK (true)`) permitem inserção por qualquer cliente anon/authenticated. O SQL pendente implementa uma regra de validação rígida impedindo que não-administradores gravem `author_name = 'Tá na Cara!'`, `is_official = true` ou `is_featured = true`.

---

## e) Controle de Baralhos na Tela Principal (Home)

- **Tabela:** `public.saved_decks`.
- **Colunas:**
  - `is_featured boolean NOT NULL DEFAULT false`: indica se o baralho deve ser exibido na tela inicial.
  - `featured_order integer DEFAULT 0`: define a ordem de apresentação (1, 2, 3...).
- **Gravação:**
  - Método `adminService.setFeaturedDecks(deckIdsInOrder: string[])` e persistência via checkbox `is_featured` no construtor de baralhos do painel.

---

## f) Criação de Caras e Hash de Conteúdo

- **Upload e Armazenamento:**
  - Imagens são recortadas pelo cliente em `ImageCropperModal.tsx` em formato JPEG quadrado.
  - Enviadas ao Supabase Storage no bucket `custom_faces`.
  - Registradas na tabela `public.saved_faces`.
- **Hash de conteúdo:**
  - No schema em execução em produção, **não há coluna nem cálculo de hash ativo**.
  - A proposta de coluna `content_hash` está descrita em `supabase/pending/04_face_hash_and_status.sql` e será suportada pelo cliente via detecção de recursos e checagem local via `crypto.subtle` (SHA-256).

---

## g) Coincidência entre Caras do Banco Oficial e Caras Públicas

- Na leitura remota atual, a tabela `saved_faces` está vazia (0 registros).
- As imagens canônicas em `/standard-faces/` funcionam como acervo estático de inicialização do jogo.
- O novo construtor de baralhos oficial unifica todo o acervo no catálogo público da comunidade, de forma que qualquer cara do jogo — seja criada pela equipe ("Tá na Cara!") ou por jogadores — viva no mesmo catálogo de consulta.
