# Relatório de Auditoria — Modelo de Dados e Salvamento

**Data:** 20 de Novembro de 2026  
**Projeto:** Tá na Cara! Mas de quem?!  
**Ambiente:** Supabase (ddfefbwauuhqxqufhwwr.supabase.co) / Localhost  

---

## 1. Como "Salvar" caras e baralhos funciona hoje (Cópia vs. Referência)

**Diagnóstico:**  
Ao clicar em "Salvar" em uma cara ou baralho da comunidade, o aplicativo executava um **INSERT duplicado completo** na tabela remota (`saved_faces` ou `saved_decks`) e/ou no `localStorage`:

- **Caras:** A função `auth.saveFace(userId, name, imageUrl, false, currentUser.username)` em `src/services/auth.ts` inseria uma nova linha independente na tabela `saved_faces` com `user_id = currentUser.id`.
- **Baralhos:** A função `auth.saveDeck(userId, name, cardCount, cards, false, currentUser.username)` em `src/services/auth.ts` inseria uma nova linha independente na tabela `saved_decks` com `user_id = currentUser.id`, duplicando todo o array JSON de cartas.

**Conclusão:** Não existia modelo de referência. Cada salvamento criava uma cópia física da linha no banco de dados.

---

## 2. Identificação do Criador Original vs. Usuário que Salvou

- **Tabela `saved_faces`:** Colunas existentes: `id`, `user_id`, `name`, `image_url`, `created_at`, `is_public`, `author_name`, `is_official`, `is_hidden`.
- **Tabela `saved_decks`:** Colunas existentes: `id`, `user_id`, `name`, `card_count`, `cards`, `created_at`, `is_public`, `author_name`, `is_official`, `is_draft`, `is_featured`, `featured_order`, `description`, `cover_image_url`, `is_hidden`.
- **Problema identificado:** Nas cópias salvas, o `user_id` passava a ser o ID do usuário que clicou em "Salvar", em vez do criador original. Em muitos casos, o `author_name` era sobrescrito pelo nome do próprio usuário que salvou, tornando impossível distinguir o autor original pelo schema sem correlacionar a `image_url` com a linha mais antiga.
- Não existem colunas como `original_face_id`, `original_deck_id` ou `creator_id`.

---

## 3. Restrição de Unicidade Usuário + Cara / Baralho

- **Diagnóstico:** Inexistente. Não havia restrição de `UNIQUE(user_id, image_url)` ou `UNIQUE(user_id, face_id)`.
- **Impacto no banco:** Um mesmo usuário pôde salvar a mesma cara ou baralho dezenas de vezes (ex.: clicando repetidamente no botão "Salvar"), criando dezenas de linhas idênticas com IDs distintos para o mesmo usuário.

---

## 4. Armazenamento de Imagens e Hashes de Conteúdo

- **Local:** Supabase Storage, bucket público `custom_faces`.
- **Padrão de nomenclatura:** `room_{roomCode}/face_{timestamp}_{random}.jpg` (gerado em `ImageCropperModal.tsx`).
- **Hash de conteúdo:** Inexistente no banco e no upload atual. Não havia cálculo de checksum/hash (como SHA-256) antes do envio, gerando múltiplos uploads da mesma imagem com nomes de arquivo diferentes.

---

## 5. Snapshot de Baralho na Partida (Em Andamento)

- **Diagnóstico:** Ao criar uma sala via `network.createRoom(roomCode, playerName, config)`, o objeto `config` (contendo `config.customCards: Character[]`) é serializado e salvo diretamente na coluna JSONB `game_rooms.config`.
- Ao entrar na sala via `handleJoinRoom`, o convidado lê `room.config.customCards` e monta o baralho da partida (`syncedDeck`).
- **Conclusão:** A partida **JÁ guarda um snapshot** das cartas no momento da criação da sala. Não há leitura ao vivo de `saved_decks` durante a partida. No entanto, se um arquivo de imagem no Storage for excluído fisicamente durante a partida, o link pode quebrar — razão pela qual a exclusão deve ser lógica (`status = 'deleted'`).

---

## 6. Limite de 360 Caras e 10 Baralhos

- **Onde estavam implementados:**
  - `ProfilePage.tsx`: `savedFaces.length >= 360` e `savedDecks.length >= 10`.
  - `CommunityExplorerPage.tsx`: `userSavedFaces.length >= 360`.
  - `ImportSharedDeckModal.tsx`: `currentFaceCount >= 360`.
  - `AccountLimitModal.tsx`: Modal exibido quando o limite é atingido.
- **O que contavam:** Contavam `savedFaces.length` e `savedDecks.length` indiscriminadamente — ou seja, somavam as caras enviadas pelo próprio usuário e todas as cópias de caras salvas da comunidade.

---

## 7. Quantificação de Duplicatas no Banco de Dados Remoto (Leitura Realizada)

Auditoria de leitura realizada via API do Supabase em 20/11/2026:

| Métrica | Quantidade Encontrada |
| :--- | :--- |
| **Total de linhas em `saved_faces`** | **232** |
| **URLs de imagem duplicadas (`image_url`)** | **97 URLs distintas** (repetidas de 2 a 4 vezes cada) |
| **Nomes de caras duplicados** | **96 nomes distintos** |
| **Total de linhas em `saved_decks`** | **7** |
| **Baralhos duplicados** | **1 baralho ("Aleatório #1") repetido 5 vezes** (1 original + 4 cópias salvas pelo mesmo usuário) |

Exemplo de caso real auditado:
- Imagem: `.../custom_faces/room_profile/face_1793756418453_ok5gz.jpg` ("Jair Bolsonaro")
  - Linha 1: Criada por `Kelly` em 04/11/2026 01:40 (Original, Pública).
  - Linha 2: Cópia salva por `maria helena salaroli` em 04/11/2026 03:11.
  - Linha 3: Cópia salva por `maria helena salaroli` em 04/11/2026 03:30.
