import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { adminService, type SaveOfficialDeckPayload, type OfficialDeckDraftFace } from '../../services/admin';
import type { SavedFace, SavedDeck } from '../../services/auth';
import type { Character } from '../../types/game';
import { Button } from '../ui/Button';
import { CaraLegenda } from '../community/CaraLegenda';
import { FacePreviewModal } from '../community/FacePreviewModal';
import { normalizeText, getRelevanceTier } from '../../utils/communitySearch';
import { calculateImageHash } from '../../utils/imageHash';
import { sounds } from '../../utils/sound';
import {
  ArrowLeft,
  Search,
  X,
  Upload,
  Trash2,
  Check,
  AlertTriangle,
  ZoomIn,
} from 'lucide-react';

interface OfficialDeckBuilderProps {
  editingDeck: SavedDeck | null;
  initialBrokenCards?: Character[];
  onBack: () => void;
  onSaved: (deck: SavedDeck) => void;
}

const ITEMS_PER_BATCH = 36;
const TARGET_COUNTS = [15, 30, 60, 90] as const;

export const OfficialDeckBuilder: React.FC<OfficialDeckBuilderProps> = ({
  editingDeck,
  initialBrokenCards = [],
  onBack,
  onSaved,
}) => {
  // 1. Dados Básicos do Baralho
  const [deckName, setDeckName] = useState(editingDeck?.name || '');
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [description, setDescription] = useState(editingDeck?.description || '');
  const [isFeatured, setIsFeatured] = useState<boolean>(Boolean(editingDeck?.is_featured));

  // 2. Abas: "Catálogo" e "Novas caras"
  const [activeTab, setActiveTab] = useState<'catalog' | 'drafts'>('catalog');

  // 3. Catálogo Público Completo
  const [catalogFaces, setCatalogFaces] = useState<SavedFace[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // 4. Seleção de Cartas
  // Armazena IDs de caras do catálogo selecionadas
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<string>>(() => {
    if (!editingDeck?.cards) return new Set<string>();
    return new Set(editingDeck.cards.map((c) => c.id).filter(Boolean));
  });

  // 5. Novas Caras em Rascunho (criadas nesta sessão, ainda não gravadas)
  const [draftFaces, setDraftFaces] = useState<OfficialDeckDraftFace[]>([]);
  // IDs de rascunhos selecionados
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());

  // 6. Filtros e Busca no Catálogo
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'todos' | 'comunidade' | 'tanacara'>('todos');
  const [sortOrder, setSortOrder] = useState<'recentes' | 'salvas' | 'az'>('recentes');
  const [visibleBatch, setVisibleBatch] = useState(ITEMS_PER_BATCH);

  // 7. Modais e Avisos
  const [previewFace, setPreviewFace] = useState<SavedFace | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Diálogo Anti-Duplicata
  const [duplicateWarning, setDuplicateWarning] = useState<{
    type: 'exact_image' | 'similar_name';
    draft?: OfficialDeckDraftFace;
    existingFace: SavedFace;
    tempFile?: File | Blob;
  } | null>(null);

  // Cartas quebradas em modo de reparação
  const [brokenCards, setBrokenCards] = useState<Character[]>(initialBrokenCards);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar catálogo de caras públicas
  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const faces = await adminService.getPublicFacesForCatalog();
      setCatalogFaces(faces);
    } catch (err) {
      console.warn('Falha ao carregar catálogo público:', err);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Total de cartas atualmente selecionadas
  const totalSelectedCount = selectedCatalogIds.size + selectedDraftIds.size;

  // Cálculo da meta e progresso
  const progressInfo = useMemo(() => {
    const count = totalSelectedCount;
    if (count === 0) {
      return { text: '0 de 15 cartas · faltam 15', canSave: false };
    }
    if (count < 15) {
      return { text: `${count} de 15 cartas · faltam ${15 - count}`, canSave: false };
    }
    if (count === 15) {
      return { text: '15 de 15 cartas · pronto para salvar (ou continue para 30)', canSave: true };
    }
    if (count < 30) {
      return { text: `${count} de 30 cartas · faltam ${30 - count}`, canSave: false };
    }
    if (count === 30) {
      return { text: '30 de 30 cartas · pronto para salvar (ou continue para 60)', canSave: true };
    }
    if (count < 60) {
      return { text: `${count} de 60 cartas · faltam ${60 - count}`, canSave: false };
    }
    if (count === 60) {
      return { text: '60 de 60 cartas · pronto para salvar (ou continue para 90)', canSave: true };
    }
    if (count < 90) {
      return { text: `${count} de 90 cartas · faltam ${90 - count}`, canSave: false };
    }
    if (count === 90) {
      return { text: '90 de 90 cartas · pronto para salvar (limite máximo)', canSave: true };
    }
    return { text: `${count} cartas · excedeu o limite máximo de 90`, canSave: false };
  }, [totalSelectedCount]);

  // Filtragem e ordenação do catálogo
  const filteredCatalogFaces = useMemo(() => {
    const q = searchQuery.trim();

    return catalogFaces.filter((face) => {
      // Filtro de Origem
      const isTanaCara = face.author_name === 'Tá na Cara!' || Boolean(face.is_official);
      if (sourceFilter === 'tanacara' && !isTanaCara) return false;
      if (sourceFilter === 'comunidade' && isTanaCara) return false;

      // Filtro de Busca
      if (q) {
        const tier = getRelevanceTier(face.name, q);
        if (tier === null) return false;
      }

      return true;
    });
  }, [catalogFaces, sourceFilter, searchQuery]);

  const sortedCatalogFaces = useMemo(() => {
    const q = searchQuery.trim();
    const list = [...filteredCatalogFaces];

    list.sort((a, b) => {
      if (q) {
        const tierA = getRelevanceTier(a.name, q) ?? 99;
        const tierB = getRelevanceTier(b.name, q) ?? 99;
        if (tierA !== tierB) return tierA - tierB;
      }

      if (sortOrder === 'az') {
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      }

      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    return list;
  }, [filteredCatalogFaces, searchQuery, sortOrder]);

  const visibleCatalogFaces = useMemo(() => {
    return sortedCatalogFaces.slice(0, visibleBatch);
  }, [sortedCatalogFaces, visibleBatch]);

  // Rolagem infinita
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 200) {
      if (visibleBatch < sortedCatalogFaces.length) {
        setVisibleBatch((prev) => prev + ITEMS_PER_BATCH);
      }
    }
  };

  // Alternar seleção de cara do catálogo
  const toggleCatalogFace = (faceId: string) => {
    sounds.playClick();
    setSelectedCatalogIds((prev) => {
      const next = new Set(prev);
      if (next.has(faceId)) {
        next.delete(faceId);
      } else {
        if (next.size + selectedDraftIds.size >= 90) {
          sounds.playWrong();
          alert('Limite máximo de 90 cartas atingido para este baralho.');
          return prev;
        }
        next.add(faceId);
      }
      return next;
    });
  };

  // Processar arquivos enviados (upload, drag&drop, colar)
  const processNewImageFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    for (const file of fileArray) {
      // 1. Calcular hash SHA-256 no cliente
      const hash = await calculateImageHash(file);

      // 2. Anti-duplicata: checar se hash já existe no catálogo público
      const existingByHash = hash
        ? catalogFaces.find((f: any) => f.content_hash === hash || f.image_url?.includes(hash))
        : null;

      if (existingByHash) {
        sounds.playWrong();
        setDuplicateWarning({
          type: 'exact_image',
          existingFace: existingByHash,
          tempFile: file,
        });
        continue;
      }

      // 3. Anti-duplicata entre os próprios rascunhos
      const existingInDrafts = draftFaces.find((d) => d.contentHash && d.contentHash === hash);
      if (existingInDrafts) {
        sounds.playWrong();
        alert(`Esta imagem já foi adicionada nos rascunhos como "${existingInDrafts.name}".`);
        continue;
      }

      // 4. Montar rascunho
      const previewUrl = URL.createObjectURL(file);
      const baseName = file.name.replace(/\.[^/.]+$/, '').trim().slice(0, 20);
      const tempId = 'draft_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

      const draft: OfficialDeckDraftFace = {
        tempId,
        name: baseName,
        file,
        previewUrl,
        contentHash: hash,
      };

      // 5. Anti-duplicata: checar nome igual ou muito parecido no catálogo
      const normName = normalizeText(baseName);
      const existingByName = normName.length >= 3
        ? catalogFaces.find((f) => normalizeText(f.name) === normName)
        : null;

      if (existingByName) {
        sounds.playWrong();
        setDuplicateWarning({
          type: 'similar_name',
          draft,
          existingFace: existingByName,
        });
      } else {
        setDraftFaces((prev) => [...prev, draft]);
        setSelectedDraftIds((prev) => new Set(prev).add(tempId));
        setActiveTab('drafts');
        sounds.playClick();
      }
    }
  };

  // Suporte a colar (Ctrl+V) de imagens
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        processNewImageFiles(e.clipboardData.files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [catalogFaces, draftFaces]);

  // Atualizar nome de cara em rascunho
  const updateDraftName = (tempId: string, newName: string) => {
    setDraftFaces((prev) =>
      prev.map((d) => (d.tempId === tempId ? { ...d, name: newName.slice(0, 20) } : d))
    );
  };

  // Remover cara em rascunho
  const removeDraftFace = (tempId: string) => {
    sounds.playClick();
    setDraftFaces((prev) => prev.filter((d) => d.tempId !== tempId));
    setSelectedDraftIds((prev) => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
  };

  // Completar seleção aleatoriamente até a próxima meta
  const handleCompleteSelection = () => {
    sounds.playClick();
    const currentCount = totalSelectedCount;
    const nextTarget = TARGET_COUNTS.find((t) => t > currentCount);
    if (!nextTarget) {
      alert('O baralho já possui a quantidade máxima de 90 cartas.');
      return;
    }

    const needed = nextTarget - currentCount;
    const availableFaces = catalogFaces.filter((f) => !selectedCatalogIds.has(f.id));

    if (availableFaces.length < needed) {
      alert(`Catálogo possui apenas ${availableFaces.length} cartas disponíveis para preenchimento.`);
      return;
    }

    // Embaralhar disponíveis e selecionar
    const shuffled = [...availableFaces].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, needed);

    setSelectedCatalogIds((prev) => {
      const next = new Set(prev);
      chosen.forEach((f) => next.add(f.id));
      return next;
    });
  };

  // Selecionar cartas visíveis no lote atual
  const handleSelectVisible = () => {
    sounds.playClick();
    setSelectedCatalogIds((prev) => {
      const next = new Set(prev);
      for (const face of visibleCatalogFaces) {
        if (next.size + selectedDraftIds.size >= 90) break;
        next.add(face.id);
      }
      return next;
    });
  };

  // Limpar seleção
  const handleClearSelection = () => {
    sounds.playClick();
    setSelectedCatalogIds(new Set());
    setSelectedDraftIds(new Set());
  };

  // Substituir cartas indisponíveis por cartas aleatórias do catálogo em um toque
  const handleReplaceBrokenCards = () => {
    sounds.playClick();
    if (brokenCards.length === 0) return;

    const brokenIds = new Set(brokenCards.map((c) => c.id));
    // Remove as quebradas da seleção atual
    const cleanCatalogIds = new Set(
      Array.from(selectedCatalogIds).filter((id) => !brokenIds.has(id))
    );

    const needed = brokenCards.length;
    const availableFaces = catalogFaces.filter((f) => !cleanCatalogIds.has(f.id) && !brokenIds.has(f.id));
    const shuffled = [...availableFaces].sort(() => Math.random() - 0.5);
    const replacements = shuffled.slice(0, needed);

    replacements.forEach((f) => cleanCatalogIds.add(f.id));
    setSelectedCatalogIds(cleanCatalogIds);
    setBrokenCards([]);
    sounds.playWin();
  };

  // Confirmação para sair
  const handleAttemptBack = () => {
    const hasUnsavedChanges = draftFaces.length > 0 || totalSelectedCount > 0;
    if (hasUnsavedChanges) {
      if (
        !window.confirm(
          'Existem cartas selecionadas ou rascunhos não gravados. Deseja realmente sair e descartar as alterações?'
        )
      ) {
        return;
      }
    }
    onBack();
  };

  // Salvar Baralho Oficial
  const handleSaveDeck = async () => {
    setErrorMessage(null);
    const clean = deckName.trim();

    if (!clean) {
      sounds.playWrong();
      setErrorMessage('Informe o nome do baralho.');
      return;
    }

    if (!progressInfo.canSave) {
      sounds.playWrong();
      setErrorMessage('O baralho precisa ter exatamente 15, 30, 60 ou 90 cartas para ser salvo.');
      return;
    }

    // Verificar se todas as novas cartas em rascunho possuem nome preenchido
    for (let i = 0; i < draftFaces.length; i++) {
      const d = draftFaces[i];
      if (!d.name.trim()) {
        sounds.playWrong();
        setErrorMessage(`A nova cara #${i + 1} precisa de um nome obrigatório.`);
        setActiveTab('drafts');
        return;
      }
    }

    sounds.playClick();
    setIsSaving(true);

    try {
      // Mapear caras selecionadas do catálogo
      const selectedFaces = catalogFaces.filter((f) => selectedCatalogIds.has(f.id));

      const payload: SaveOfficialDeckPayload = {
        deckId: editingDeck?.id,
        name: clean,
        description: description.trim(),
        isFeatured,
        selectedCatalogFaces: selectedFaces,
        draftFaces: draftFaces.filter((d) => selectedDraftIds.has(d.tempId)),
      };

      const result = await adminService.saveOfficialDeckWithDrafts(payload);

      if (result) {
        sounds.playWin();
        onSaved(result);
      } else {
        throw new Error('Não foi possível salvar o baralho no Supabase.');
      }
    } catch (err: any) {
      sounds.playWrong();
      setErrorMessage(err.message || 'Ocorreu um erro ao gravar o baralho.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* CABEÇALHO DO CONSTRUTOR (Superfície única sem cartões aninhados) */}
      <div className="pb-4 border-b border-[#E2DACD] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={handleAttemptBack}
            className="inline-flex items-center gap-1.5 text-xs text-[#6F655C] hover:text-[#2B2420] transition-colors cursor-pointer mb-1"
          >
            <ArrowLeft size={14} />
            <span>Voltar aos Baralhos</span>
          </button>

          {/* Nome do Baralho: Campo Grande sem borda com contador em foco */}
          <div className="relative">
            <input
              type="text"
              maxLength={35}
              value={deckName}
              onFocus={() => setIsNameFocused(true)}
              onBlur={() => setIsNameFocused(false)}
              onChange={(e) => setDeckName(e.target.value.slice(0, 35))}
              placeholder="Nome do baralho..."
              className="w-full font-serif text-2xl sm:text-3xl text-[#2B2420] bg-transparent border-0 border-b border-transparent hover:border-[#E2DACD] focus:border-[#B4532F] outline-none placeholder-[#A39A90] transition-colors py-0.5 leading-tight"
            />
            {isNameFocused && (
              <span className="absolute right-2 top-2 text-[11px] font-mono text-[#A39A90] bg-[#FBF8F3] px-1 rounded pointer-events-none">
                {deckName.length}/35
              </span>
            )}
          </div>

          {/* Descrição Opcional do Baralho */}
          <input
            type="text"
            value={description}
            maxLength={160}
            onChange={(e) => setDescription(e.target.value.slice(0, 160))}
            placeholder="Descrição curta (opcional)..."
            className="w-full text-xs font-sans text-[#2B2420] bg-transparent border-0 border-b border-transparent hover:border-[#E2DACD] focus:border-[#B4532F] outline-none placeholder-[#A39A90] transition-colors py-0.5"
          />

          {/* Opção Simples: Destaque na Home (Checkbox em texto) */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-[#6F655C] hover:text-[#2B2420] transition-colors pt-1">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="accent-[#B4532F] rounded cursor-pointer"
            />
            <span>Exibir este baralho em destaque na página inicial (Home)</span>
          </label>
        </div>

        {/* Lado Direito: Progresso e Ação Primária "Salvar baralho" */}
        <div className="flex flex-col md:items-end gap-2 shrink-0">
          <Button
            variant="primary"
            size="md"
            disabled={!progressInfo.canSave || isSaving}
            onClick={handleSaveDeck}
            className="w-full md:w-auto"
          >
            {isSaving ? 'Salvando...' : 'Salvar baralho'}
          </Button>

          <span className="text-xs font-sans text-[#6F655C]">
            {progressInfo.text}
          </span>
        </div>
      </div>

      {/* Alerta de Erro de Validação */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Alerta de Cartas Quebradas (se veio em estado "precisa de ajuste") */}
      {brokenCards.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-700 shrink-0" />
            <span>
              Este baralho contém <strong>{brokenCards.length} carta(s) indisponível(is)</strong> (removidas ou tornadas privadas por jogadores).
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReplaceBrokenCards}
          >
            Substituir por caras aleatórias
          </Button>
        </div>
      )}

      {/* NAVEGAÇÃO POR ABAS DE TEXTO: "Catálogo" e "Novas caras" */}
      <div className="border-b border-[#E2DACD] flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-sm font-sans">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`pb-2.5 cursor-pointer transition-colors relative font-medium ${
              activeTab === 'catalog'
                ? 'text-[#2B2420] border-b-2 border-[#2B2420]'
                : 'text-[#6F655C] hover:text-[#2B2420]'
            }`}
          >
            Catálogo
            <span className="ml-1.5 text-xs text-[#A39A90]">
              ({catalogFaces.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('drafts')}
            className={`pb-2.5 cursor-pointer transition-colors relative font-medium ${
              activeTab === 'drafts'
                ? 'text-[#2B2420] border-b-2 border-[#2B2420]'
                : 'text-[#6F655C] hover:text-[#2B2420]'
            }`}
          >
            Novas caras
            {draftFaces.length > 0 && (
              <span className="ml-1.5 text-xs font-bold text-[#B4532F] bg-[#FDF5F2] px-1.5 py-0.2 rounded-full border border-[#F3D7CD]">
                {draftFaces.length}
              </span>
            )}
          </button>
        </div>

        {/* Input Oculto de Arquivo para Adicionar Novas Caras */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              processNewImageFiles(e.target.files);
            }
          }}
        />

        {activeTab === 'drafts' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={13} className="mr-1.5" />
            Adicionar cara
          </Button>
        )}
      </div>

      {/* CONTEÚDO DA ABA 1: CATÁLOGO PÚBLICO */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Linha de Controles: Busca, Filtro de Origem e Ordenação */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans">
            {/* Campo de Busca Normalizada */}
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A39A90] pointer-events-none"
              />
              <input
                type="text"
                placeholder="Buscar caras por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-[#E2DACD] rounded-lg text-xs text-[#2B2420] placeholder-[#A39A90] outline-none focus:border-[#2B2420] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A39A90] hover:text-[#2B2420]"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filtros em Texto: Todas · Da comunidade · Tá na Cara! */}
            <div className="flex items-center gap-1.5 flex-wrap text-[#6F655C]">
              <button
                type="button"
                onClick={() => setSourceFilter('todos')}
                className={`cursor-pointer transition-colors ${
                  sourceFilter === 'todos' ? 'text-[#2B2420] font-semibold' : 'hover:text-[#2B2420]'
                }`}
              >
                Todas
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setSourceFilter('comunidade')}
                className={`cursor-pointer transition-colors ${
                  sourceFilter === 'comunidade' ? 'text-[#2B2420] font-semibold' : 'hover:text-[#2B2420]'
                }`}
              >
                Da comunidade
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setSourceFilter('tanacara')}
                className={`cursor-pointer transition-colors ${
                  sourceFilter === 'tanacara' ? 'text-[#2B2420] font-semibold' : 'hover:text-[#2B2420]'
                }`}
              >
                Tá na Cara!
              </button>
            </div>

            {/* Ordenação */}
            <div className="flex items-center gap-1.5 text-[#6F655C]">
              <span className="text-[#A39A90]">Ordenar:</span>
              <button
                type="button"
                onClick={() => setSortOrder('recentes')}
                className={`cursor-pointer transition-colors ${
                  sortOrder === 'recentes' ? 'text-[#2B2420] font-semibold' : 'hover:text-[#2B2420]'
                }`}
              >
                Mais recentes
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setSortOrder('az')}
                className={`cursor-pointer transition-colors ${
                  sortOrder === 'az' ? 'text-[#2B2420] font-semibold' : 'hover:text-[#2B2420]'
                }`}
              >
                A–Z
              </button>
            </div>
          </div>

          {/* Grade de Caras do Catálogo com Rolagem Infinita */}
          <div
            onScroll={handleScroll}
            className="max-h-[640px] overflow-y-auto pr-1"
          >
            {loadingCatalog ? (
              <div className="py-16 text-center text-xs text-[#6F655C]">
                Carregando catálogo de caras...
              </div>
            ) : visibleCatalogFaces.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#6F655C] bg-white border border-[#E2DACD] rounded-xl">
                Nenhuma cara encontrada no catálogo com os filtros selecionados.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {visibleCatalogFaces.map((face) => {
                  const isSelected = selectedCatalogIds.has(face.id);

                  return (
                    <div
                      key={face.id}
                      onClick={() => toggleCatalogFace(face.id)}
                      className={`group relative rounded-xl border p-2 bg-white flex flex-col items-center cursor-pointer select-none transition-all shadow-2xs ${
                        isSelected
                          ? 'border-[#2B2420] ring-1 ring-[#2B2420]'
                          : 'border-[#E2DACD] hover:border-[#2B2420]/50'
                      }`}
                    >
                      {/* Checkmark Discreto de Seleção */}
                      <div
                        className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-[#2B2420] text-white'
                            : 'bg-white/80 border border-[#E2DACD] text-transparent group-hover:border-[#2B2420]'
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>

                      {/* Lupa para Pré-visualização Ampliada */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewFace(face);
                        }}
                        title="Ampliar foto (P)"
                        className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-white/80 border border-[#E2DACD] text-[#6F655C] hover:text-[#2B2420] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-2xs"
                      >
                        <ZoomIn size={12} />
                      </button>

                      {/* Imagem Central sem Borda Colorida */}
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-[#F6F2EA] border border-[#E2DACD]/60 relative">
                        <img
                          src={face.image_url}
                          alt={face.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Legenda em Sans 500 ~14px */}
                      <CaraLegenda
                        name={face.name}
                        authorName={face.author_name}
                        isOfficial={face.author_name === 'Tá na Cara!' || Boolean(face.is_official)}
                        searchQuery={searchQuery}
                        className="mt-1.5"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: NOVAS CARAS (RASCUNHOS) */}
      {activeTab === 'drafts' && (
        <div className="space-y-4">
          {/* Zona de Drop / Adicionar Caras */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) {
                processNewImageFiles(e.dataTransfer.files);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-[#E2DACD] hover:border-[#B4532F] rounded-2xl bg-[#FBF8F3] hover:bg-white text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-white border border-[#E2DACD] flex items-center justify-center text-[#B4532F]">
              <Upload size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2B2420]">
                Clique para selecionar fotos, arraste arquivos aqui ou cole da área de transferência (Ctrl+V)
              </p>
              <p className="text-[11px] text-[#6F655C] mt-0.5">
                Fotos quadradas em formato JPEG, PNG ou WebP. As cartas ficam em rascunho até que o baralho seja salvo.
              </p>
            </div>
          </div>

          {draftFaces.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6F655C] bg-white border border-[#E2DACD] rounded-xl">
              Nenhuma nova cara em rascunho ainda. Adicione fotos acima para incluí-las neste baralho.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {draftFaces.map((draft, idx) => {
                const isSelected = selectedDraftIds.has(draft.tempId);

                return (
                  <div
                    key={draft.tempId}
                    className={`rounded-xl border p-2 bg-white flex flex-col items-center relative transition-all shadow-2xs ${
                      isSelected ? 'border-[#2B2420] ring-1 ring-[#2B2420]' : 'border-[#E2DACD]'
                    }`}
                  >
                    {/* Botão de Remover Cara dos Rascunhos */}
                    <button
                      type="button"
                      onClick={() => removeDraftFace(draft.tempId)}
                      title="Remover cara dos rascunhos"
                      className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-white/90 hover:bg-rose-50 border border-[#E2DACD] text-[#6F655C] hover:text-rose-700 flex items-center justify-center cursor-pointer shadow-2xs"
                    >
                      <Trash2 size={12} />
                    </button>

                    {/* Checkbox de Seleção */}
                    <div
                      onClick={() => {
                        sounds.playClick();
                        setSelectedDraftIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(draft.tempId)) next.delete(draft.tempId);
                          else next.add(draft.tempId);
                          return next;
                        });
                      }}
                      className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-[#2B2420] text-white flex items-center justify-center cursor-pointer"
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>

                    {/* Foto da Nova Cara */}
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-[#F6F2EA] border border-[#E2DACD]/60 relative mb-2">
                      <img
                        src={draft.previewUrl}
                        alt={draft.name || `Nova #${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Campo de Nome Obrigatório Inline */}
                    <div className="w-full">
                      <input
                        type="text"
                        maxLength={20}
                        placeholder="Nome obrigatório..."
                        value={draft.name}
                        onChange={(e) => updateDraftName(draft.tempId, e.target.value)}
                        className="w-full text-xs font-sans font-medium text-[#2B2420] text-center border-b border-[#E2DACD] focus:border-[#B4532F] outline-none pb-0.5"
                      />
                      <span className="text-[10px] text-[#A39A90] text-center block mt-0.5 font-sans">
                        por Tá na Cara!
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BARRA FIXA DE SELEÇÃO NO RODAPÉ (Exibida sempre que houver seleção) */}
      {totalSelectedCount > 0 && (
        <div className="sticky bottom-4 z-20 bg-[#2B2420] text-white rounded-2xl px-4 sm:px-6 py-3 shadow-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold font-sans">
              {totalSelectedCount} carta(s) selecionada(s)
            </span>
            <span className="text-xs text-[#E2DACD]">
              · {progressInfo.text}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCompleteSelection}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors cursor-pointer"
            >
              Completar meta
            </button>

            {activeTab === 'catalog' && (
              <button
                type="button"
                onClick={handleSelectVisible}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors cursor-pointer"
              >
                Selecionar visíveis
              </button>
            )}

            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-rose-200 transition-colors cursor-pointer"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE PRÉ-VISUALIZAÇÃO AMPLIADA */}
      {previewFace && (
        <FacePreviewModal
          isOpen={Boolean(previewFace)}
          face={previewFace}
          isSaved={false}
          isSelected={selectedCatalogIds.has(previewFace.id)}
          onClose={() => setPreviewFace(null)}
          onToggleSave={() => {}}
          onToggleSelect={() => {
            toggleCatalogFace(previewFace.id);
            setPreviewFace(null);
          }}
          isSelectionEnabled={true}
        />
      )}

      {/* DIÁLOGO ANTI-DUPLICATA (Imagem idêntica ou Nome parecido) */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-[#E2DACD] shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-[#B4532F]">
              <AlertTriangle size={18} />
              <h4 className="font-serif text-base text-[#2B2420]">
                {duplicateWarning.type === 'exact_image'
                  ? 'Essa cara já existe no catálogo'
                  : 'Cara com nome similar no catálogo'}
              </h4>
            </div>

            <p className="text-xs text-[#6F655C]">
              {duplicateWarning.type === 'exact_image'
                ? 'Identificamos uma foto idêntica já cadastrada no catálogo público. Recomenda-se reutilizar a cara existente por referência em vez de criar uma duplicata.'
                : `Já existe uma cara chamada "${duplicateWarning.existingFace.name}" no catálogo público. Deseja usar a existente ou criar esta mesmo assim?`}
            </p>

            {/* Miniatura da existente */}
            <div className="flex items-center gap-3 p-3 bg-[#FBF8F3] rounded-xl border border-[#E2DACD]">
              <img
                src={duplicateWarning.existingFace.image_url}
                alt={duplicateWarning.existingFace.name}
                className="w-12 h-12 rounded-lg object-cover border border-[#E2DACD]"
              />
              <div className="min-w-0">
                <span className="font-serif text-sm text-[#2B2420] truncate block">
                  {duplicateWarning.existingFace.name}
                </span>
                <span className="text-[11px] text-[#6F655C]">
                  {duplicateWarning.existingFace.author_name === 'Tá na Cara!' ? 'Tá na Cara!' : `por ${duplicateWarning.existingFace.author_name || 'Comunidade'}`}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {duplicateWarning.type === 'similar_name' && duplicateWarning.draft && (
                <button
                  type="button"
                  onClick={() => {
                    if (duplicateWarning.draft) {
                      setDraftFaces((prev) => [...prev, duplicateWarning.draft!]);
                      setSelectedDraftIds((prev) => new Set(prev).add(duplicateWarning.draft!.tempId));
                      setActiveTab('drafts');
                    }
                    setDuplicateWarning(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#E2DACD] text-xs font-medium text-[#6F655C] hover:text-[#2B2420] cursor-pointer"
                >
                  Criar mesmo assim
                </button>
              )}

              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  toggleCatalogFace(duplicateWarning.existingFace.id);
                  setDuplicateWarning(null);
                }}
              >
                Usar a existente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
