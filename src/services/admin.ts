import { supabase } from './supabase';
import { auth, type SavedDeck, type SavedFace } from './auth';
import type { Character } from '../types/game';
import {
  TAMANHO_MINIMO_BARALHO,
  TAMANHO_MAXIMO_BARALHO,
  isDeckSizeValid,
} from '../constants/deck';

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  target_name?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface AdminOverviewMetrics {
  officialDecksCount: number;
  officialFacesCount: number;
  communityDecksCount: number;
  pendingReportsCount: number;
  bannedUsersCount: number;
}

export interface OfficialDeckDraftFace {
  tempId: string;
  name: string;
  file?: File | Blob;
  previewUrl: string;
  contentHash?: string;
}

export interface SaveOfficialDeckPayload {
  deckId?: string;
  name: string;
  description?: string;
  isFeatured: boolean;
  selectedCatalogFaces: SavedFace[];
  draftFaces: OfficialDeckDraftFace[];
}

export interface DeckIntegrityStatus {
  needsAdjustment: boolean;
  brokenCards: Character[];
}

export interface OfficialDeckInput {
  id?: string;
  name: string;
  description?: string;
  cover_image_url?: string;
  card_count: number;
  cards: Character[];
  is_draft: boolean;
  is_public: boolean;
}

export interface ContentReportItem {
  id: string;
  content_type: 'deck' | 'face' | 'user';
  content_id: string;
  content_name?: string;
  author_name?: string;
  reported_by?: string;
  reason?: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  resolution_action?: string;
  resolved_by?: string;
  resolved_at?: string;
  admin_notes?: string;
}

export interface AdminUserItem {
  id: string;
  username: string;
  email?: string;
  is_admin: boolean;
  is_banned: boolean;
  ban_reason?: string;
  created_at: string;
}

export class AdminService {
  /**
   * Verifica se o usuário atual é administrador consultando diretamente o Supabase
   */
  public async verifyIsAdmin(): Promise<boolean> {
    const user = auth.getCurrentUser();
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (error || !data) {
        if (user.email) {
          const { data: emailData } = await supabase
            .from('user_profiles')
            .select('is_admin')
            .eq('email', user.email)
            .maybeSingle();
          if (emailData?.is_admin) return true;
        }
        return false;
      }
      return !!data.is_admin;
    } catch {
      return false;
    }
  }

  /**
   * Busca métricas gerais para a Visão Geral do Painel
   */
  public async getOverviewMetrics(): Promise<AdminOverviewMetrics> {
    try {
      const [officialDecksRes, officialFacesRes, communityRes, reportsRes, bannedRes] = await Promise.all([
        supabase.from('saved_decks').select('id', { count: 'exact', head: true }).or('is_official.eq.true,author_name.eq.Tá na Cara!'),
        supabase.from('saved_faces').select('id', { count: 'exact', head: true }).eq('is_official', true),
        supabase.from('saved_decks').select('id', { count: 'exact', head: true }).eq('is_public', true).eq('is_official', false),
        supabase.from('content_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('is_banned', true),
      ]);

      return {
        officialDecksCount: officialDecksRes.count || 0,
        officialFacesCount: officialFacesRes.count || 0,
        communityDecksCount: communityRes.count || 0,
        pendingReportsCount: reportsRes.count || 0,
        bannedUsersCount: bannedRes.count || 0,
      };
    } catch (err) {
      console.warn('Erro ao carregar métricas da visão geral:', err);
      return {
        officialDecksCount: 0,
        officialFacesCount: 0,
        communityDecksCount: 0,
        pendingReportsCount: 0,
        bannedUsersCount: 0,
      };
    }
  }

  /**
   * Registra uma ação executada pelo admin na tabela de auditoria
   */
  public async logAction(
    action: string,
    targetType: 'deck' | 'card' | 'user' | 'report' | 'system',
    targetId: string,
    targetName?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const user = auth.getCurrentUser();
    if (!user) return;

    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        admin_name: user.username,
        action,
        target_type: targetType,
        target_id: targetId,
        target_name: targetName || null,
        details: details || {},
      });
    } catch (err) {
      console.warn('Falha ao registrar log de auditoria:', err);
    }
  }

  /**
   * Lista o histórico recente de ações de auditoria
   */
  public async getAuditLogs(limit = 30): Promise<AdminAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Erro ao buscar logs de auditoria:', error);
        return [];
      }
      return (data as AdminAuditLog[]) || [];
    } catch {
      return [];
    }
  }

  // ==========================================
  // CARAS OFICIAIS
  // ==========================================

  /**
   * Busca todas as caras oficiais do jogo
   */
  public async getOfficialFaces(): Promise<SavedFace[]> {
    try {
      const { data, error } = await supabase
        .from('saved_faces')
        .select('*')
        .eq('is_official', true)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao buscar caras oficiais:', error);
        return [];
      }
      return (data as SavedFace[]) || [];
    } catch (err) {
      console.warn('Exceção ao buscar caras oficiais:', err);
      return [];
    }
  }

  /**
   * Cria ou atualiza uma cara oficial do Tá na Cara!
   */
  public async saveOfficialFace(name: string, imageUrl: string, id?: string): Promise<SavedFace | null> {
    const user = auth.getCurrentUser();
    const adminId = user?.id || 'admin_tanacara';
    const cleanName = name.trim().slice(0, 20);

    const payload = {
      name: cleanName,
      image_url: imageUrl,
      is_official: true,
      is_public: true,
      is_hidden: false,
      author_name: 'Tá na Cara!',
      user_id: adminId,
    };

    try {
      if (id) {
        const { data, error } = await supabase
          .from('saved_faces')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        await this.logAction('Atualizou cara oficial', 'card', id, cleanName);
        return data as SavedFace;
      } else {
        const { data, error } = await supabase
          .from('saved_faces')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        await this.logAction('Criou cara oficial', 'card', data.id, cleanName);
        return data as SavedFace;
      }
    } catch (err) {
      console.error('Erro ao salvar cara oficial:', err);
      return null;
    }
  }

  /**
   * Exclui uma cara oficial
   */
  public async deleteOfficialFace(faceId: string, faceName?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('saved_faces')
        .delete()
        .eq('id', faceId);

      if (error) throw error;
      await this.logAction('Excluiu cara oficial', 'card', faceId, faceName || 'Cara Oficial');
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // BARALHOS OFICIAIS
  // ==========================================

  /**
   * Busca todos os baralhos oficiais do jogo (por flag ou autor "Tá na Cara!")
   */
  public async getOfficialDecks(): Promise<SavedDeck[]> {
    try {
      const { data, error } = await supabase
        .from('saved_decks')
        .select('*')
        .or('is_official.eq.true,author_name.eq.Tá na Cara!')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao buscar baralhos oficiais:', error);
        return [];
      }
      return (data as SavedDeck[]) || [];
    } catch (err) {
      console.warn('Exceção ao buscar baralhos oficiais:', err);
      return [];
    }
  }

  /**
   * Busca catálogo de caras públicas para compor baralhos
   */
  public async getPublicFacesForCatalog(searchQuery?: string): Promise<SavedFace[]> {
    try {
      let query = supabase
        .from('saved_faces')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(300);

      if (searchQuery?.trim()) {
        query = query.ilike('name', `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data as SavedFace[];
      }
    } catch (err) {
      console.warn('Falha ao buscar catálogo de caras públicas:', err);
    }
    return auth.getCachedPublicFaces();
  }

  /**
   * Alterna se o baralho oficial aparece em destaque na página inicial (Home)
   */
  public async toggleDeckFeatured(deckId: string, isFeatured: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('saved_decks')
        .update({ is_featured: isFeatured })
        .eq('id', deckId);
      if (error) throw error;
      await this.logAction(
        isFeatured ? 'Fixou baralho na Home' : 'Removeu baralho da Home',
        'deck',
        deckId
      );
      return true;
    } catch (err) {
      console.warn('Falha ao alternar destaque do baralho:', err);
      return false;
    }
  }

  /**
   * Verifica se o baralho contém cartas quebradas ou indisponíveis (de terceiros que foram removidas/ocultadas)
   */
  public checkDeckBrokenCards(deck: SavedDeck, publicFaces: SavedFace[]): DeckIntegrityStatus {
    const cardList = deck.cards || [];
    const publicMap = new Map<string, SavedFace>();
    publicFaces.forEach((f) => {
      publicMap.set(f.id, f);
      if (f.image_url) publicMap.set(f.image_url, f);
    });

    const brokenCards: Character[] = [];
    for (const c of cardList) {
      // Se for cara com imagem padrão estática local (ex.: /standard-faces/Ana.jpg), é permanente
      if (c.imageUrl?.startsWith('/standard-faces/')) {
        continue;
      }

      const match = publicMap.get(c.id) || (c.imageUrl ? publicMap.get(c.imageUrl) : undefined);
      if (!match) {
        // Não encontrada no catálogo público
        brokenCards.push(c);
      } else if (match.is_hidden || match.is_public === false || (match as any).status === 'deleted') {
        brokenCards.push(c);
      }
    }

    const validCardsCount = cardList.length - brokenCards.length;
    // Regra flexível: só entra em "precisa de ajuste" se restarem MENOS de 15 cartas válidas.
    // Se restarem 15 ou mais, o baralho continua jogável normalmente.
    const needsAdjustment = validCardsCount < TAMANHO_MINIMO_BARALHO;

    return {
      needsAdjustment,
      brokenCards,
    };
  }

  /**
   * Salva um baralho oficial combinando cartas do catálogo e novas cartas em rascunho.
   * Utiliza RPC atômica se disponível; caso contrário, executa fluxo no cliente com limpeza compensatória.
   */
  public async saveOfficialDeckWithDrafts(payload: SaveOfficialDeckPayload): Promise<SavedDeck | null> {
    const user = auth.getCurrentUser();
    const adminId = user?.id || 'admin_tanacara';

    const cleanName = payload.name.trim().slice(0, 35);
    const totalCardsCount = payload.selectedCatalogFaces.length + payload.draftFaces.length;

    if (!isDeckSizeValid(totalCardsCount)) {
      throw new Error(`Quantidade de cartas inválida: ${totalCardsCount}. O baralho precisa ter de ${TAMANHO_MINIMO_BARALHO} a ${TAMANHO_MAXIMO_BARALHO} cartas.`);
    }

    // 1. Tentar execução atômica via RPC no servidor
    try {
      const uploadedDraftFaces: { name: string; image_url: string; content_hash?: string }[] = [];
      for (const draft of payload.draftFaces) {
        let imageUrl = draft.previewUrl;
        if (draft.file) {
          const filePath = `room_official/face_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('custom_faces')
            .upload(filePath, draft.file, { contentType: 'image/jpeg' });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('custom_faces').getPublicUrl(filePath);
            if (urlData?.publicUrl) imageUrl = urlData.publicUrl;
          }
        }
        uploadedDraftFaces.push({
          name: draft.name.trim().slice(0, 20),
          image_url: imageUrl,
          content_hash: draft.contentHash || undefined,
        });
      }

      const existingFaceIds = payload.selectedCatalogFaces.map((f) => f.id);
      const { data: rpcData, error: rpcError } = await supabase.rpc('save_official_deck_atomic', {
        p_deck_id: payload.deckId || null,
        p_name: cleanName,
        p_description: (payload.description || '').trim().slice(0, 160),
        p_is_featured: payload.isFeatured,
        p_existing_face_ids: existingFaceIds,
        p_new_faces: uploadedDraftFaces,
      });

      if (!rpcError && rpcData?.success) {
        const { data: savedDeck } = await supabase
          .from('saved_decks')
          .select('*')
          .eq('id', rpcData.deck_id)
          .single();
        if (savedDeck) {
          await this.logAction(
            payload.deckId ? 'Editou baralho oficial' : 'Criou baralho oficial',
            'deck',
            savedDeck.id,
            savedDeck.name,
            { totalCards: totalCardsCount, isFeatured: payload.isFeatured }
          );
          return savedDeck as SavedDeck;
        }
      }
    } catch {
      // Prossegue para o fallback compensatório no cliente
    }

    // 2. Fallback no cliente com limpeza compensatória
    const createdFaceIds: string[] = [];
    try {
      const createdCards: Character[] = [];

      for (const draft of payload.draftFaces) {
        let imageUrl = draft.previewUrl;
        if (draft.file) {
          const filePath = `room_official/face_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('custom_faces')
            .upload(filePath, draft.file, { contentType: 'image/jpeg' });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('custom_faces').getPublicUrl(filePath);
            if (urlData?.publicUrl) imageUrl = urlData.publicUrl;
          }
        }

        const cleanFaceName = draft.name.trim().slice(0, 20);
        // Cria a cara no catálogo público com dono "Tá na Cara!" (is_official = false)
        const { data: newFaceData, error: newFaceError } = await supabase
          .from('saved_faces')
          .insert({
            user_id: adminId,
            name: cleanFaceName,
            image_url: imageUrl,
            is_public: true,
            author_name: 'Tá na Cara!',
            is_official: false,
            is_hidden: false,
          })
          .select('*')
          .single();

        if (newFaceError || !newFaceData) {
          throw new Error(`Falha ao registrar a cara "${cleanFaceName}" no catálogo público.`);
        }

        createdFaceIds.push(newFaceData.id);
        createdCards.push({
          id: newFaceData.id,
          name: newFaceData.name,
          imageUrl: newFaceData.image_url,
        });
      }

      // Monta todas as cartas (catálogo + recém criadas)
      const catalogCards: Character[] = payload.selectedCatalogFaces.map((f) => ({
        id: f.id,
        name: f.name,
        imageUrl: f.image_url,
      }));
      const allCards = [...catalogCards, ...createdCards];

      const deckRecord = {
        user_id: adminId,
        author_name: 'Tá na Cara!',
        is_official: true,
        name: cleanName,
        description: (payload.description || '').trim().slice(0, 160),
        cover_image_url: allCards[0]?.imageUrl || '',
        card_count: allCards.length,
        cards: allCards,
        is_draft: false,
        is_public: true,
        is_featured: payload.isFeatured,
        is_hidden: false,
      };

      let resultDeck: SavedDeck | null = null;
      if (payload.deckId) {
        const { data, error } = await supabase
          .from('saved_decks')
          .update(deckRecord)
          .eq('id', payload.deckId)
          .select()
          .single();
        if (error) throw error;
        resultDeck = data as SavedDeck;
      } else {
        const { data, error } = await supabase
          .from('saved_decks')
          .insert(deckRecord)
          .select()
          .single();
        if (error) throw error;
        resultDeck = data as SavedDeck;
      }

      await this.logAction(
        payload.deckId ? 'Editou baralho oficial' : 'Criou baralho oficial',
        'deck',
        resultDeck.id,
        resultDeck.name,
        { totalCards: allCards.length, isFeatured: payload.isFeatured }
      );

      return resultDeck;
    } catch (err) {
      console.error('Falha no processo de gravação do baralho oficial. Executando limpeza compensatória:', err);
      // Limpeza compensatória: remove as caras que haviam sido inseridas nesta operação
      for (const faceId of createdFaceIds) {
        try {
          await supabase.from('saved_faces').delete().eq('id', faceId);
        } catch {
          // ignore
        }
      }
      throw err;
    }
  }

  /**
   * Salva ou atualiza um baralho oficial
   */
  public async saveOfficialDeck(deckInput: OfficialDeckInput): Promise<SavedDeck | null> {
    const user = auth.getCurrentUser();
    const adminId = user?.id || 'admin_tanacara';

    const payload = {
      user_id: adminId,
      author_name: 'Tá na Cara!',
      is_official: true,
      name: deckInput.name.trim().slice(0, 35),
      description: (deckInput.description || '').trim().slice(0, 160),
      cover_image_url: deckInput.cover_image_url || deckInput.cards[0]?.imageUrl || '',
      card_count: deckInput.card_count || deckInput.cards.length,
      cards: deckInput.cards,
      is_draft: deckInput.is_draft,
      is_public: !deckInput.is_draft,
      is_hidden: false,
    };

    try {
      if (deckInput.id) {
        const { data, error } = await supabase
          .from('saved_decks')
          .update(payload)
          .eq('id', deckInput.id)
          .select()
          .single();

        if (error) throw error;

        await this.logAction(
          deckInput.is_draft ? 'Salvou rascunho de baralho oficial' : 'Publicou baralho oficial',
          'deck',
          deckInput.id,
          payload.name,
          { cardsCount: payload.card_count, is_draft: payload.is_draft }
        );

        return data as SavedDeck;
      } else {
        const { data, error } = await supabase
          .from('saved_decks')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        await this.logAction(
          deckInput.is_draft ? 'Criou rascunho de baralho oficial' : 'Criou e publicou baralho oficial',
          'deck',
          data.id,
          payload.name,
          { cardsCount: payload.card_count, is_draft: payload.is_draft }
        );

        return data as SavedDeck;
      }
    } catch (err) {
      console.error('Falha ao salvar baralho oficial:', err);
      return null;
    }
  }

  /**
   * Exclui um baralho oficial
   */
  public async deleteOfficialDeck(deckId: string, deckName?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('saved_decks')
        .delete()
        .eq('id', deckId);

      if (error) {
        console.error('Erro ao excluir baralho oficial:', error);
        return false;
      }

      await this.logAction('Excluiu baralho oficial', 'deck', deckId, deckName || 'Baralho Oficial');
      return true;
    } catch (err) {
      console.error('Exceção ao excluir baralho oficial:', err);
      return false;
    }
  }

  // ==========================================
  // DESTAQUES DA HOME (SOMENTE OFICIAIS DO TÁ NA CARA!)
  // ==========================================

  /**
   * Busca os baralhos que estão marcados como destaque para a tela inicial (somente oficiais)
   */
  public async getFeaturedDecks(): Promise<SavedDeck[]> {
    try {
      const { data, error } = await supabase
        .from('saved_decks')
        .select('*')
        .eq('is_featured', true)
        .eq('is_official', true)
        .eq('is_hidden', false)
        .order('featured_order', { ascending: true });

      if (error) {
        console.warn('Erro ao buscar destaques da home:', error);
        return [];
      }
      return (data as SavedDeck[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Busca SOMENTE baralhos oficiais elegíveis para destaque (publicados e não ocultos)
   */
  public async getEligibleDecksForFeatured(): Promise<SavedDeck[]> {
    try {
      const { data, error } = await supabase
        .from('saved_decks')
        .select('*')
        .eq('is_official', true)
        .eq('is_draft', false)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (error) return [];
      return (data as SavedDeck[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Atualiza a lista e a ordenação dos destaques da Home
   */
  public async setFeaturedDecks(deckIdsInOrder: string[]): Promise<boolean> {
    try {
      // 1. Desmarcar todos os outros baralhos como destaque
      await supabase
        .from('saved_decks')
        .update({ is_featured: false, featured_order: 0 })
        .not('id', 'in', `(${deckIdsInOrder.join(',') || '00000000-0000-0000-0000-000000000000'})`);

      // 2. Marcar cada um com sua respectiva ordem (1-based)
      for (let i = 0; i < deckIdsInOrder.length; i++) {
        await supabase
          .from('saved_decks')
          .update({ is_featured: true, featured_order: i + 1 })
          .eq('id', deckIdsInOrder[i]);
      }

      await this.logAction(
        'Atualizou baralhos oficiais em destaque na Home',
        'system',
        'home_featured',
        `${deckIdsInOrder.length} baralhos`,
        { deckIds: deckIdsInOrder }
      );

      return true;
    } catch (err) {
      console.error('Erro ao atualizar destaques da home:', err);
      return false;
    }
  }

  // ==========================================
  // MODERAÇÃO DE DENÚNCIAS
  // ==========================================

  /**
   * Busca todas as denúncias de conteúdo
   */
  public async getReports(statusFilter?: 'pending' | 'resolved' | 'all'): Promise<ContentReportItem[]> {
    try {
      let query = supabase.from('content_reports').select('*').order('created_at', { ascending: false });
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (error) return [];
      return (data as ContentReportItem[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Resolve ou descarta uma denúncia
   */
  public async resolveReport(
    reportId: string,
    action: 'dismissed' | 'resolved',
    adminNotes?: string,
    hideContent?: boolean,
    targetType?: 'deck' | 'face',
    targetId?: string
  ): Promise<boolean> {
    const user = auth.getCurrentUser();
    try {
      const { error } = await supabase
        .from('content_reports')
        .update({
          status: action,
          resolved_by: user?.username || 'admin',
          resolved_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
          resolution_action: action === 'resolved' ? (hideContent ? 'Conteúdo ocultado' : 'Aprovado após análise') : 'Denúncia descartada',
        })
        .eq('id', reportId);

      if (error) return false;

      if (hideContent && targetType && targetId) {
        if (targetType === 'deck') {
          await supabase.from('saved_decks').update({ is_hidden: true }).eq('id', targetId);
        } else if (targetType === 'face') {
          await supabase.from('saved_faces').update({ is_hidden: true }).eq('id', targetId);
        }
      }

      await this.logAction(
        action === 'resolved' ? 'Resolveu denúncia' : 'Descartou denúncia',
        'report',
        reportId,
        undefined,
        { action, hideContent, targetType, targetId }
      );

      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // CONTAS E BANIMENTOS
  // ==========================================

  /**
   * Lista usuários cadastrados
   */
  public async getUsers(query?: string): Promise<AdminUserItem[]> {
    try {
      let q = supabase
        .from('user_profiles')
        .select('id, username, email, is_admin, is_banned, ban_reason, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (query && query.trim()) {
        q = q.or(`username.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`);
      }

      const { data, error } = await q;
      if (error) return [];
      return (data as AdminUserItem[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Aplica ou remove suspensão em um usuário
   */
  public async setUserBanStatus(
    userId: string,
    isBanned: boolean,
    reason?: string,
    username?: string
  ): Promise<boolean> {
    const admin = auth.getCurrentUser();
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_banned: isBanned,
          ban_reason: isBanned ? (reason || 'Violação dos Termos de Uso') : null,
          banned_by: isBanned ? (admin?.username || 'admin') : null,
          banned_until: null,
        })
        .eq('id', userId);

      if (error) return false;

      await this.logAction(
        isBanned ? 'Suspendeu conta de usuário' : 'Removeu suspensão de conta',
        'user',
        userId,
        username || userId,
        { reason }
      );

      return true;
    } catch {
      return false;
    }
  }
}

export const adminService = new AdminService();
