import { useState, useRef, useEffect, type FC, type ChangeEvent, type DragEvent } from 'react';
import { supabase } from '../services/supabase';
import { X, ArrowLeft, AlertCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { sounds } from '../utils/sound';
import type { Character } from '../types/game';
import { auth, type AppUser, type SavedFace } from '../services/auth';
import { computeImageHash, checkAntiDuplicate } from '../services/dataAdapter';
import { normalizeText } from '../utils/communitySearch';
import { Button } from './ui/Button';

export interface CroppedFaceResult {
  name: string;
  blob: Blob;
  previewUrl: string;
  contentHash?: string;
  existingFaceId?: string;
}

export interface BatchFaceItem {
  id: string;
  file?: File | Blob;
  previewUrl: string;
  canvasBlob: Blob;
  name: string;
  originalFileName?: string;
  contentHash: string;
  zoom: number;
  offset: { x: number; y: number };
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  exactHashMatch?: SavedFace | null;
  similarNameMatch?: SavedFace | null;
  useExistingRef?: SavedFace | null;
  validationError?: string | null;
}

interface ImageCropperModalProps {
  onClose: () => void;
  onSaveCharacter?: (character: Character) => void;
  onSaveCropped?: (result: CroppedFaceResult) => void;
  onSaveBatch?: (faces: Array<{ id: string; name: string; imageUrl: string; isExistingReference?: boolean }>) => void | Promise<void>;
  roomCode?: string;
  initialImageSrc?: string | null;
  initialName?: string;
  deferUpload?: boolean;
  currentUser?: AppUser | null;
  remainingUploadSlots?: number;
}

/**
 * Validação rigorosa do nome da cara:
 * - Obrigatório, mínimo 2 caracteres após trim, máximo 35.
 * - Recusar nome igual ao do arquivo (com ou sem extensão, normalizado).
 * - Recusar números/símbolos puros e nomes genéricos óbvios ("img", "foto", "screenshot", "sem nome").
 */
function validateFaceName(name: string, originalFileName?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Digite o nome da cara.';
  }
  if (trimmed.length < 2) {
    return 'Mínimo de 2 caracteres.';
  }
  if (trimmed.length > 35) {
    return 'Máximo de 35 caracteres.';
  }
  // Exige ao menos uma letra
  if (!/[a-zA-ZÀ-ÿ]/.test(trimmed)) {
    return 'O nome deve conter letras.';
  }

  // Compara com o nome do arquivo original se existente
  if (originalFileName) {
    const fileBase = originalFileName.replace(/\.[^/.]+$/, '').trim();
    const normName = normalizeText(trimmed);
    const normBase = normalizeText(fileBase);
    const normOriginal = normalizeText(originalFileName);
    if (normName === normBase || normName === normOriginal) {
      return 'Digite um nome real, não use o nome do arquivo.';
    }
  }

  // Nomes genéricos óbvios
  const norm = normalizeText(trimmed);
  if (
    /^(img|image|imagem|foto|photo|screenshot|captura|cara|personagem)[\s_-]*\d*$/i.test(norm) ||
    norm === 'sem nome' ||
    norm === 'anonimo' ||
    norm === 'desconhecido'
  ) {
    return 'Digite um nome identificável para a cara.';
  }

  return null;
}

/**
 * Renderiza uma imagem em um canvas 300x300 quadrado (cover com zoom e offset)
 */
async function renderSquareCrop(
  imageSource: string | HTMLImageElement,
  zoom: number = 1,
  offset: { x: number; y: number } = { x: 0, y: 0 }
): Promise<{ blob: Blob; dataUrl: string }> {
  let img: HTMLImageElement;
  if (typeof imageSource === 'string') {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = (err) => reject(err);
      el.src = imageSource;
    });
  } else {
    img = imageSource;
  }

  const canvas = document.createElement('canvas');
  const size = 300;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível obter contexto 2D');

  ctx.fillStyle = '#FAF6F0';
  ctx.fillRect(0, 0, size, size);

  const scale = (size / Math.min(img.width, img.height)) * zoom;
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const drawX = (size - drawW) / 2 + offset.x;
  const drawY = (size - drawH) / 2 + offset.y;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Erro ao gerar imagem quadrada.'));
          return;
        }
        resolve({ blob, dataUrl: canvas.toDataURL('image/jpeg', 0.88) });
      },
      'image/jpeg',
      0.88
    );
  });
}

export const ImageCropperModal: FC<ImageCropperModalProps> = ({
  onClose,
  onSaveCharacter,
  onSaveCropped,
  onSaveBatch,
  roomCode = 'builder',
  initialImageSrc = null,
  initialName = '',
  deferUpload = false,
  currentUser = null,
  remainingUploadSlots = 30,
}) => {
  // Passos: 1 = Escolher fotos; 2 = Enquadrar e Nomear
  const [step, setStep] = useState<1 | 2>(initialImageSrc ? 2 : 1);
  const [items, setItems] = useState<BatchFaceItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  // Editor individual de enquadramento (aberto ao tocar na miniatura no Passo 2)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editZoom, setEditZoom] = useState(1);
  const [editOffset, setEditOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeEditingImgRef = useRef<HTMLImageElement | null>(null);

  // Se já veio com initialImageSrc, processa no início
  useEffect(() => {
    if (initialImageSrc) {
      processIncomingImages([
        { src: initialImageSrc, name: initialName, fileName: undefined },
      ]);
    }
  }, []);

  // Atalho universal de Colar Ctrl+V no modal
  useEffect(() => {
    const handlePaste = (e: globalThis.ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems || clipboardItems.length === 0) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        handleSelectedFiles(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [items, remainingUploadSlots]);

  // Escuta tecla Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, step]);

  /**
   * Processa lista de arquivos File/Blob recebidos (via seletor, drop ou paste)
   */
  const handleSelectedFiles = async (files: FileList | File[]) => {
    setGeneralError(null);
    const validImages: File[] = [];
    const invalidTypes: string[] = [];

    const fileList = Array.from(files);
    for (const f of fileList) {
      if (f.type.startsWith('image/')) {
        // Limite de 15MB por foto
        if (f.size > 15 * 1024 * 1024) {
          invalidTypes.push(`${f.name} (muito grande, máx 15MB)`);
        } else {
          validImages.push(f);
        }
      } else {
        invalidTypes.push(`${f.name} (formato não suportado)`);
      }
    }

    if (invalidTypes.length > 0) {
      setGeneralError(`Alguns arquivos foram ignorados: ${invalidTypes.slice(0, 3).join(', ')}${invalidTypes.length > 3 ? '...' : ''}`);
    }

    if (validImages.length === 0) return;

    // Respeita limite de até 30 no lote e limite de slots restantes do usuário
    const maxAllowed = Math.min(30, remainingUploadSlots || 30);
    const availableSlots = Math.max(0, maxAllowed - items.length);

    if (availableSlots <= 0) {
      setGeneralError(`Limite de ${maxAllowed} caras atingido.`);
      return;
    }

    let toProcess = validImages;
    if (validImages.length > availableSlots) {
      toProcess = validImages.slice(0, availableSlots);
      setGeneralError(`Limite de ${maxAllowed} imagens por lote. Foram adicionadas as primeiras ${availableSlots}.`);
    }

    // Converte arquivos para itens de lote
    const newItemsData = await Promise.all(
      toProcess.map(async (file) => {
        const src = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = (e) => res(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        return { src, name: '', fileName: file.name, file };
      })
    );

    await processIncomingImages(newItemsData);
  };

  /**
   * Prepara os itens no lote calculando hash SHA-256 e renderização quadrada
   */
  const processIncomingImages = async (
    incoming: Array<{ src: string; name: string; fileName?: string; file?: File | Blob }>
  ) => {
    const createdItems: BatchFaceItem[] = [];

    for (const entry of incoming) {
      try {
        const { blob, dataUrl } = await renderSquareCrop(entry.src, 1, { x: 0, y: 0 });
        const hash = await computeImageHash(blob);

        // Checagem anti-duplicata de hash no cliente
        let exactHashMatch: SavedFace | null = null;
        try {
          const { exactHashMatch: match } = await checkAntiDuplicate('', hash);
          exactHashMatch = match;
        } catch {
          // fallback silencioso caso RPC/coluna ainda não esteja aplicada
        }

        const id = 'face_item_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        const initialValErr = exactHashMatch ? null : validateFaceName(entry.name, entry.fileName);

        createdItems.push({
          id,
          file: entry.file,
          previewUrl: dataUrl,
          canvasBlob: blob,
          name: entry.name,
          originalFileName: entry.fileName,
          contentHash: hash,
          zoom: 1,
          offset: { x: 0, y: 0 },
          status: 'pending',
          exactHashMatch,
          similarNameMatch: null,
          useExistingRef: exactHashMatch,
          validationError: initialValErr,
        });
      } catch (err) {
        console.warn('Falha ao processar miniatura da imagem:', err);
      }
    }

    setItems((prev) => [...prev, ...createdItems]);
    setStep(2);
  };

  // Botão "Colar" universal (mobile & desktop)
  const handlePasteButtonClick = async () => {
    sounds.playClick();
    setGeneralError(null);

    if (!navigator.clipboard) {
      setGeneralError('Seu navegador não permite colar por aqui. Escolha uma foto.');
      return;
    }

    try {
      if (typeof navigator.clipboard.read === 'function') {
        const clipboardItems = await navigator.clipboard.read();
        const files: File[] = [];
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              files.push(new File([blob], 'imagem_colada.png', { type: blob.type }));
            }
          }
        }
        if (files.length > 0) {
          await handleSelectedFiles(files);
          return;
        }
      }

      // Leitura de texto para base64 ou URL
      if (typeof navigator.clipboard.readText === 'function') {
        const text = (await navigator.clipboard.readText()).trim();
        if (text.startsWith('data:image/') || text.match(/^https?:\/\/.*\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i)) {
          await processIncomingImages([{ src: text, name: '', fileName: 'imagem_colada' }]);
          return;
        }
      }

      setGeneralError('Nenhuma imagem encontrada na área de transferência. Copie uma imagem primeiro.');
    } catch {
      setGeneralError('Seu navegador não permite colar por aqui. Escolha uma foto.');
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSelectedFiles(e.target.files);
    }
    // limpa o valor para permitir re-selecionar o mesmo arquivo se o usuário quiser
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectedFiles(e.dataTransfer.files);
    }
  };

  // Atualização do nome de um item no lote
  const handleItemNameChange = async (itemId: string, newName: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const valErr = validateFaceName(newName, item.originalFileName);

    // Checagem anti-duplicata no lote (se dois itens têm o mesmo nome normalizado)
    const normalized = normalizeText(newName.trim());
    let duplicateInBatch = false;
    if (normalized.length >= 2) {
      const otherSame = items.find(
        (i) => i.id !== itemId && normalizeText(i.name.trim()) === normalized
      );
      if (otherSame) {
        duplicateInBatch = true;
      }
    }

    // Checagem de nome parecido na comunidade
    let similarMatch: SavedFace | null = null;
    if (!valErr && !duplicateInBatch && normalized.length >= 2) {
      try {
        const { similarNameMatch } = await checkAntiDuplicate(newName);
        similarMatch = similarNameMatch;
      } catch {
        // fallback
      }
    }

    setItems((prev) =>
      prev.map((i) => {
        if (i.id === itemId) {
          return {
            ...i,
            name: newName,
            validationError: duplicateInBatch
              ? 'Já existe outra cara com esse mesmo nome neste lote.'
              : valErr,
            similarNameMatch: similarMatch,
            useExistingRef: i.useExistingRef?.id === similarMatch?.id ? i.useExistingRef : null,
          };
        }
        return i;
      })
    );
  };

  const handleRemoveItem = (itemId: string) => {
    sounds.playClick();
    const remaining = items.filter((i) => i.id !== itemId);
    setItems(remaining);
    if (remaining.length === 0) {
      setStep(1);
    }
  };

  // Navegação com tecla Enter: pula para o próximo campo vazio ou confirma se todos válidos
  const handleKeyDownName = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Procura próximo item sem nome válido
      const nextUnnamed = items.findIndex(
        (it, idx) => idx > currentIndex && !it.exactHashMatch && !it.useExistingRef && Boolean(it.validationError || !it.name.trim())
      );
      if (nextUnnamed !== -1) {
        const nextId = items[nextUnnamed].id;
        nameInputRefs.current[nextId]?.focus();
      } else {
        // Se não houver após, procura antes
        const prevUnnamed = items.findIndex(
          (it) => !it.exactHashMatch && !it.useExistingRef && Boolean(it.validationError || !it.name.trim())
        );
        if (prevUnnamed !== -1) {
          const prevId = items[prevUnnamed].id;
          nameInputRefs.current[prevId]?.focus();
        } else if (isAllValid && !isSubmitting) {
          handleConfirmBatch();
        }
      }
    }
  };

  // Abrir editor de enquadramento da miniatura
  const handleOpenFrameEditor = (item: BatchFaceItem) => {
    sounds.playClick();
    setEditingItemId(item.id);
    setEditZoom(item.zoom || 1);
    setEditOffset(item.offset || { x: 0, y: 0 });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      activeEditingImgRef.current = img;
      renderEditingCanvas(img, item.zoom || 1, item.offset || { x: 0, y: 0 });
    };
    img.src = item.previewUrl;
  };

  const renderEditingCanvas = (
    img: HTMLImageElement,
    zoomVal: number,
    offsetVal: { x: number; y: number }
  ) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#FAF6F0';
    ctx.fillRect(0, 0, size, size);

    const scale = (size / Math.min(img.width, img.height)) * zoomVal;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (size - drawW) / 2 + offsetVal.x;
    const drawY = (size - drawH) / 2 + offsetVal.y;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  };

  const handleSaveFrameEditor = async () => {
    if (!editingItemId || !activeEditingImgRef.current) {
      setEditingItemId(null);
      return;
    }
    sounds.playClick();
    try {
      const { blob, dataUrl } = await renderSquareCrop(
        activeEditingImgRef.current,
        editZoom,
        editOffset
      );
      const newHash = await computeImageHash(blob);

      setItems((prev) =>
        prev.map((i) => {
          if (i.id === editingItemId) {
            return {
              ...i,
              previewUrl: dataUrl,
              canvasBlob: blob,
              contentHash: newHash,
              zoom: editZoom,
              offset: editOffset,
            };
          }
          return i;
        })
      );
    } catch (err) {
      console.warn('Erro ao salvar novo enquadramento:', err);
    }
    setEditingItemId(null);
  };

  // Checagem de prontidão
  const totalItems = items.length;
  const namedItemsCount = items.filter(
    (i) => Boolean(i.exactHashMatch) || Boolean(i.useExistingRef) || (!i.validationError && i.name.trim().length >= 2)
  ).length;
  const isAllValid = totalItems > 0 && namedItemsCount === totalItems;

  // Fechamento com confirmação se houver itens pendentes
  const handleRequestClose = () => {
    if (items.length > 0 && !isSubmitting) {
      setConfirmDiscardOpen(true);
    } else {
      onClose();
    }
  };

  // Envio final de todas as caras do lote
  const handleConfirmBatch = async () => {
    if (!isAllValid || isSubmitting) return;

    setIsSubmitting(true);
    sounds.playClick();
    setGeneralError(null);

    const savedResults: Array<{ id: string; name: string; imageUrl: string; isExistingReference?: boolean }> = [];
    const failedItems: string[] = [];

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      setUploadProgressText(`Processando ${index + 1} de ${items.length}...`);

      // Se usa referência de cara já existente (por hash ou escolha do usuário)
      if (item.useExistingRef || item.exactHashMatch) {
        const refFace = item.useExistingRef || item.exactHashMatch!;
        savedResults.push({
          id: refFace.id,
          name: refFace.name,
          imageUrl: refFace.image_url,
          isExistingReference: true,
        });
        continue;
      }

      // Se for deferUpload (ex: modo admin rascunho de baralho oficial)
      if (deferUpload || onSaveCropped) {
        if (onSaveCropped) {
          onSaveCropped({
            name: item.name.trim(),
            blob: item.canvasBlob,
            previewUrl: item.previewUrl,
            contentHash: item.contentHash,
          });
        }
        savedResults.push({
          id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name: item.name.trim(),
          imageUrl: item.previewUrl,
        });
        continue;
      }

      // Upload normal para o Supabase Storage
      let publicUrl = '';
      try {
        const filePath = `room_${roomCode}/face_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { data, error } = await supabase.storage
          .from('custom_faces')
          .upload(filePath, item.canvasBlob, { contentType: 'image/jpeg' });

        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from('custom_faces')
            .getPublicUrl(filePath);
          publicUrl = urlData.publicUrl;
        }
      } catch (err) {
        console.warn('Falha no upload para Storage, fallback dataURL:', err);
      }

      if (!publicUrl) {
        publicUrl = item.previewUrl;
      }

      // Salva na tabela saved_faces (biblioteca pessoal do usuário, privada por padrão)
      try {
        if (currentUser) {
          const savedFace = await auth.saveFace(
            currentUser.id,
            item.name.trim(),
            publicUrl,
            false,
            currentUser.username
          );
          savedResults.push({
            id: savedFace.id,
            name: savedFace.name,
            imageUrl: savedFace.image_url,
          });
        } else {
          savedResults.push({
            id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: item.name.trim(),
            imageUrl: publicUrl,
          });
        }
      } catch (saveErr: any) {
        console.warn(`Erro ao salvar cara "${item.name}":`, saveErr);
        failedItems.push(item.name || `Imagem #${index + 1}`);
      }
    }

    setIsSubmitting(false);

    if (failedItems.length > 0) {
      setGeneralError(`Não foi possível salvar: ${failedItems.join(', ')}. Tente novamente.`);
      return;
    }

    // Sucesso: dispara callbacks apropriados
    if (onSaveBatch) {
      await onSaveBatch(savedResults);
    } else if (onSaveCharacter && savedResults.length > 0) {
      // Para chamadas legadas com 1 único item
      const first = savedResults[0];
      onSaveCharacter({
        id: first.id,
        name: first.name,
        imageUrl: first.imageUrl,
        avatarBg: '#1e293b',
      });
    }

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cropper-title"
      className="fixed inset-0 z-50 bg-[#2B2420]/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`bg-[#FBF8F3] border border-[#E2DACD] w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-[12px] p-5 sm:p-6 shadow-xl flex flex-col justify-between text-left relative transition-all ${
          isDragOver ? 'ring-2 ring-[#2B2420] bg-[#FAF6F0]' : ''
        }`}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E2DACD] shrink-0">
          <div>
            <h2 id="cropper-title" className="font-serif text-xl sm:text-2xl text-[#2B2420] font-normal leading-tight">
              {step === 1 ? 'Adicionar cara' : items.length === 1 ? 'Adicionar cara' : 'Adicionar caras'}
            </h2>
            {step === 2 && (
              <p className="text-xs text-[#6F655C] font-sans mt-0.5" aria-live="polite">
                {namedItemsCount} de {totalItems} nomeadas
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            aria-label="Fechar"
            className="p-1.5 text-[#6F655C] hover:text-[#2B2420] rounded-[6px] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input de arquivo invisível */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Mensagem de Erro Geral */}
        {generalError && (
          <div className="mt-3 p-3 bg-[#8C2E2A]/10 border border-[#8C2E2A]/20 rounded-[6px] text-xs text-[#8C2E2A] flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        {/* ==================================================================== */}
        {/* PASSO 1: ESCOLHER FOTOS */}
        {/* ==================================================================== */}
        {step === 1 && (
          <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center my-auto">
            <p className="text-sm sm:text-base text-[#2B2420] font-sans font-medium mb-1">
              Selecione as imagens para criar as cartas
            </p>
            <p className="hidden sm:block text-xs text-[#6F655C] font-sans mb-6">
              ou arraste imagens aqui e cole com Ctrl+V
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs sm:max-w-none justify-center mt-3 sm:mt-0">
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto"
              >
                Escolher foto
              </Button>
              <Button
                variant="secondary"
                onClick={handlePasteButtonClick}
                className="w-full sm:w-auto"
              >
                Colar
              </Button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* PASSO 2: ENQUADRAR E NOMEAR (LISTA EM LOTE) */}
        {/* ==================================================================== */}
        {step === 2 && (
          <div className="my-3 flex-1 flex flex-col overflow-hidden">
            {/* Aviso Único e Discreto no Topo da Lista */}
            <p className="text-xs text-[#6F655C] font-sans mb-3 shrink-0">
              O nome não poderá ser alterado depois.
            </p>

            {/* Lista com rolagem suave */}
            <div className="overflow-y-auto pr-1 flex-1 space-y-3 max-h-[50vh] sm:max-h-[55vh]">
              {items.map((item, index) => {
                const isExactDuplicate = Boolean(item.exactHashMatch);
                const hasExistingOption = Boolean(item.similarNameMatch);
                const usingExisting = Boolean(item.useExistingRef);

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-white/70 border border-[#E2DACD] rounded-[8px] flex items-start gap-3 transition-colors"
                  >
                    {/* Miniatura Quadrada (Toque abre ajuste de enquadramento) */}
                    <div
                      onClick={() => handleOpenFrameEditor(item)}
                      title="Toque para ajustar zoom e enquadramento"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenFrameEditor(item);
                        }
                      }}
                      className="w-16 h-16 sm:w-20 sm:h-20 aspect-square rounded-[8px] bg-[#FAF6F0] cara-frame overflow-hidden shrink-0 cursor-pointer relative group shadow-2xs"
                    >
                      <img
                        src={item.previewUrl}
                        alt="Miniatura"
                        className="w-full h-full object-cover cara-img"
                      />
                      <div className="absolute inset-0 bg-[#2B2420]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-sans">
                        Ajustar
                      </div>
                    </div>

                    {/* Informações e Campo de Nome */}
                    <div className="flex-1 min-w-0">
                      {isExactDuplicate ? (
                        <div className="py-1">
                          <p className="text-xs font-medium text-[#2B2420]">
                            Essa cara já existe
                          </p>
                          <p className="text-[11px] text-[#6F655C] mt-0.5">
                            Será usada por referência como &quot;{item.exactHashMatch?.name}&quot;.
                          </p>
                        </div>
                      ) : usingExisting ? (
                        <div className="py-1">
                          <p className="text-xs font-medium text-[#2B2420]">
                            Usando cara existente: &quot;{item.useExistingRef?.name}&quot;
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, useExistingRef: null } : it))
                              )
                            }
                            className="text-[11px] text-[#B4532F] hover:underline cursor-pointer mt-0.5 block"
                          >
                            Digitar outro nome
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input
                            ref={(el) => {
                              nameInputRefs.current[item.id] = el;
                            }}
                            type="text"
                            value={item.name}
                            maxLength={35}
                            placeholder="Nome da cara"
                            aria-label={`Nome da cara para a foto ${index + 1}`}
                            onChange={(e) => handleItemNameChange(item.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDownName(e, index)}
                            className="w-full bg-white border border-[#E2DACD] rounded-[6px] px-3 py-1.5 text-sm font-sans text-[#2B2420] placeholder-[#A39A90] focus:outline-none focus:border-[#2B2420] transition-colors"
                          />

                          {/* Erro de Validação de Nome */}
                          {item.validationError && item.name.length > 0 && (
                            <p className="text-[11px] text-[#8C2E2A] font-sans mt-1">
                              {item.validationError}
                            </p>
                          )}

                          {/* Sugestão de Cara Parecida na Comunidade */}
                          {hasExistingOption && !item.validationError && (
                            <div className="mt-1.5 p-2 bg-[#FAF6F0] border border-[#E2DACD] rounded-[6px] text-xs">
                              <p className="text-[11px] text-[#6F655C]">
                                Já existe uma cara chamada &quot;{item.similarNameMatch?.name}&quot; na comunidade.
                              </p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setItems((prev) =>
                                      prev.map((it) =>
                                        it.id === item.id ? { ...it, useExistingRef: item.similarNameMatch } : it
                                      )
                                    )
                                  }
                                  className="text-[11px] font-medium text-[#2B2420] hover:underline cursor-pointer"
                                >
                                  Usar a existente
                                </button>
                                <span className="text-[#A39A90] text-[10px]">·</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setItems((prev) =>
                                      prev.map((it) =>
                                        it.id === item.id ? { ...it, similarNameMatch: null } : it
                                      )
                                    )
                                  }
                                  className="text-[11px] text-[#6F655C] hover:underline cursor-pointer"
                                >
                                  Criar mesmo assim
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botão de Remover Item */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      aria-label="Remover imagem"
                      className="p-1 text-[#A39A90] hover:text-[#2B2420] rounded-[4px] transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rodapé Fixo */}
        <div className="pt-4 border-t border-[#E2DACD] flex items-center justify-between gap-3 shrink-0">
          {step === 2 ? (
            <>
              <button
                type="button"
                onClick={handleRequestClose}
                className="text-xs font-sans text-[#6F655C] hover:text-[#2B2420] underline cursor-pointer"
              >
                Cancelar
              </button>
              <Button
                variant="primary"
                disabled={!isAllValid || isSubmitting}
                onClick={handleConfirmBatch}
                className="min-w-[130px]"
              >
                {isSubmitting
                  ? uploadProgressText || 'Enviando...'
                  : totalItems === 1
                  ? 'Adicionar cara'
                  : `Adicionar ${totalItems} caras`}
              </Button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* SUBMODAL: AJUSTE DE ENQUADRAMENTO (PAN & ZOOM) */}
        {/* ==================================================================== */}
        {editingItemId && (
          <div className="absolute inset-0 z-20 bg-[#FBF8F3] rounded-[12px] p-5 flex flex-col justify-between animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2DACD]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItemId(null)}
                  className="p-1 text-[#6F655C] hover:text-[#2B2420] cursor-pointer"
                >
                  <ArrowLeft size={16} />
                </button>
                <h3 className="font-serif text-lg text-[#2B2420] font-normal">
                  Ajustar enquadramento
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItemId(null)}
                className="p-1 text-[#6F655C] hover:text-[#2B2420] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Canvas de recorte */}
            <div className="my-auto flex flex-col items-center">
              <div
                className="w-64 h-64 sm:w-72 sm:h-72 aspect-square rounded-[8px] bg-[#FAF6F0] cara-frame overflow-hidden shadow-sm relative cursor-move select-none"
                onMouseDown={(e) => {
                  setIsDraggingCanvas(true);
                  setDragStartPos({ x: e.clientX - editOffset.x, y: e.clientY - editOffset.y });
                }}
                onMouseMove={(e) => {
                  if (!isDraggingCanvas || !activeEditingImgRef.current) return;
                  const newOff = {
                    x: e.clientX - dragStartPos.x,
                    y: e.clientY - dragStartPos.y,
                  };
                  setEditOffset(newOff);
                  renderEditingCanvas(activeEditingImgRef.current, editZoom, newOff);
                }}
                onMouseUp={() => setIsDraggingCanvas(false)}
                onMouseLeave={() => setIsDraggingCanvas(false)}
                onTouchStart={(e) => {
                  if (!e.touches[0]) return;
                  setIsDraggingCanvas(true);
                  setDragStartPos({
                    x: e.touches[0].clientX - editOffset.x,
                    y: e.touches[0].clientY - editOffset.y,
                  });
                }}
                onTouchMove={(e) => {
                  if (!isDraggingCanvas || !e.touches[0] || !activeEditingImgRef.current) return;
                  const newOff = {
                    x: e.touches[0].clientX - dragStartPos.x,
                    y: e.touches[0].clientY - dragStartPos.y,
                  };
                  setEditOffset(newOff);
                  renderEditingCanvas(activeEditingImgRef.current, editZoom, newOff);
                }}
                onTouchEnd={() => setIsDraggingCanvas(false)}
              >
                <canvas ref={previewCanvasRef} className="w-full h-full object-cover" />
              </div>

              {/* Controle de Zoom */}
              <div className="flex items-center gap-3 mt-4 w-64 max-w-full">
                <button
                  type="button"
                  onClick={() => {
                    const z = Math.max(1, editZoom - 0.2);
                    setEditZoom(z);
                    if (activeEditingImgRef.current) renderEditingCanvas(activeEditingImgRef.current, z, editOffset);
                  }}
                  className="p-1 text-[#6F655C] hover:text-[#2B2420] cursor-pointer"
                  aria-label="Diminuir zoom"
                >
                  <ZoomOut size={16} />
                </button>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={editZoom}
                  onChange={(e) => {
                    const z = parseFloat(e.target.value);
                    setEditZoom(z);
                    if (activeEditingImgRef.current) renderEditingCanvas(activeEditingImgRef.current, z, editOffset);
                  }}
                  className="flex-1 accent-[#B4532F] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => {
                    const z = Math.min(3, editZoom + 0.2);
                    setEditZoom(z);
                    if (activeEditingImgRef.current) renderEditingCanvas(activeEditingImgRef.current, z, editOffset);
                  }}
                  className="p-1 text-[#6F655C] hover:text-[#2B2420] cursor-pointer"
                  aria-label="Aumentar zoom"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
            </div>

            {/* Ação de concluir enquadramento */}
            <div className="pt-3 border-t border-[#E2DACD] flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditingItemId(null)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSaveFrameEditor}>
                Pronto
              </Button>
            </div>
          </div>
        )}

        {/* Diálogo de confirmação de descarte de imagens */}
        {confirmDiscardOpen && (
          <div className="absolute inset-0 z-30 bg-[#2B2420]/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FBF8F3] border border-[#E2DACD] rounded-[10px] p-5 max-w-xs w-full shadow-lg text-center">
              <h4 className="font-serif text-lg text-[#2B2420] font-normal mb-1">
                Descartar {items.length} {items.length === 1 ? 'imagem' : 'imagens'}?
              </h4>
              <p className="text-xs text-[#6F655C] font-sans mb-4">
                As alterações e nomes digitados serão perdidos.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmDiscardOpen(false)}
                >
                  Continuar editando
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setConfirmDiscardOpen(false);
                    onClose();
                  }}
                >
                  Descartar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
