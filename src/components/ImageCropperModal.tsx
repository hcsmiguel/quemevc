import { useState, useRef, useEffect, type FC, type ChangeEvent, type DragEvent } from 'react';
import { supabase } from '../services/supabase';
import { Upload, X, Check, ZoomIn, ZoomOut, Move, Scissors, Clipboard, Image as ImageIcon } from 'lucide-react';
import { sounds } from '../utils/sound';
import type { Character } from '../types/game';

interface ImageCropperModalProps {
  onSaveCharacter: (character: Character) => void;
  onClose: () => void;
  initialIndex?: number;
  roomCode?: string;
  initialImageSrc?: string | null;
}

// Fallback universal para desenhar retângulos com cantos arredondados no canvas (iOS/Android)
const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
};

export const ImageCropperModal: FC<ImageCropperModalProps> = ({
  onSaveCharacter,
  onClose,
  initialIndex: _initialIndex = 1,
  roomCode = 'temp',
  initialImageSrc = null,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImageSrc);
  const [characterName, setCharacterName] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const processFile = (file: File | Blob) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Botão universal de Colar Imagem da Área de Transferência (Mobile & Desktop)
  const handlePasteFromClipboard = async () => {
    sounds.playClick();
    setErrorMsg(null);
    try {
      if (!navigator.clipboard) {
        setErrorMsg('Seu navegador não suporta leitura direta. Use o botão "Escolher Foto".');
        return;
      }

      // Tentativa 1: ler imagens binárias nativas (Blob PNG/JPEG)
      if (typeof navigator.clipboard.read === 'function') {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            for (const type of item.types) {
              if (type.startsWith('image/')) {
                const blob = await item.getType(type);
                processFile(blob);
                return;
              }
            }
          }
        } catch (readErr) {
          console.warn('navigator.clipboard.read() não disponível ou negado, tentando readText():', readErr);
        }
      }

      // Tentativa 2: ler texto se for URL de imagem ou base64
      if (typeof navigator.clipboard.readText === 'function') {
        const text = (await navigator.clipboard.readText()).trim();
        if (text.startsWith('data:image/') || text.match(/^https?:\/\/.*\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i)) {
          setImageSrc(text);
          setZoom(1);
          setOffset({ x: 0, y: 0 });
          return;
        }
      }

      setErrorMsg('Nenhuma imagem encontrada na área de transferência. Copie uma imagem primeiro e clique em Colar!');
    } catch (err) {
      console.warn('Erro ao acessar área de transferência:', err);
      setErrorMsg('Permissão de acesso à área de transferência negada. Cole com Ctrl+V ou use "Escolher Foto".');
    }
  };

  // Atalho padrão Ctrl+V
  useEffect(() => {
    const handlePaste = (e: globalThis.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      renderCanvas();
    };
  }, [imageSrc, zoom, offset]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    drawRoundedRect(ctx, 15, 15, size - 30, size - 30, 28);
    ctx.clip();

    const scale = (size / Math.min(img.width, img.height)) * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (size - drawW) / 2 + offset.x;
    const drawY = (size - drawH) / 2 + offset.y;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    drawRoundedRect(ctx, 15, 15, size - 30, size - 30, 28);
    ctx.stroke();
  };

  // Manipuladores de Mouse (Desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Manipuladores de Touch (Mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches[0]) return;
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - offset.x,
      y: e.touches[0].clientY - offset.y,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !e.touches[0]) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsUploading(true);
    sounds.playClick();

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 270;
    finalCanvas.height = 270;
    const finalCtx = finalCanvas.getContext('2d');

    if (finalCtx) {
      finalCtx.drawImage(canvas, 15, 15, 270, 270, 0, 0, 270, 270);
    }

    finalCanvas.toBlob(async (blob) => {
      if (!blob) {
        setIsUploading(false);
        return;
      }

      let publicUrl = '';
      try {
        const filePath = `room_${roomCode}/face_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { data, error } = await supabase.storage
          .from('custom_faces')
          .upload(filePath, blob, { contentType: 'image/jpeg' });

        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from('custom_faces')
            .getPublicUrl(filePath);
          publicUrl = urlData.publicUrl;
        }
      } catch (err) {
        console.warn('Falha no upload para o Supabase Storage, usando base64 fallback:', err);
      }

      if (!publicUrl) {
        publicUrl = finalCanvas.toDataURL('image/jpeg', 0.85);
      }

      const finalName = characterName.trim();
      if (!finalName) {
        setErrorMsg('O nome da cara é obrigatório. Digite um nome antes de salvar.');
        setIsUploading(false);
        return;
      }

      const newChar: Character = {
        id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
        name: finalName,
        imageUrl: publicUrl,
        avatarBg: '#1e293b',
      };

      onSaveCharacter(newChar);
      setIsUploading(false);
      onClose();
    }, 'image/jpeg', 0.88);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-3.5 my-auto animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shadow-tactile-sm shrink-0">
              <Scissors size={20} className="text-sky-700" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Personalizar Cara</h3>
              <p className="text-xs text-slate-500">Recorte e ajuste o enquadramento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
            {errorMsg}
          </div>
        )}

        {!imageSrc ? (
          <div className="flex flex-col gap-3">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-sky-300 hover:border-sky-400 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all bg-sky-50/40 hover:bg-sky-50/70"
            >
              <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mb-3 shadow-tactile-sm">
                <Upload size={28} />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 mb-1">
                Escolha uma foto ou cole da Área de Transferência
              </h4>
              <p className="text-xs text-slate-500 mb-4 max-w-xs">
                Tire uma foto, envie da galeria ou cole uma imagem copiada da internet!
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full max-w-xs">
                {/* Botão de Colar Imagem */}
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#581c87] transition-all active:translate-y-0.5 cursor-pointer"
                >
                  <Clipboard size={16} />
                  <span>Colar Imagem</span>
                </button>

                {/* Botão Escolher Foto / Câmera */}
                <label className="w-full flex items-center justify-center gap-2 cursor-pointer px-4 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#0284c7] transition-all active:translate-y-0.5">
                  <ImageIcon size={16} />
                  <span>Escolher Foto</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* Canvas Interativo com Suporte a Mouse e Touch */}
            <div
              className="relative cursor-move select-none rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-900 shadow-inner flex items-center justify-center"
              style={{ touchAction: 'none' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <canvas ref={canvasRef} className="block w-[260px] h-[260px] sm:w-[280px] sm:h-[280px]" />
              <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm text-[10px] text-slate-700 font-extrabold px-2 py-0.5 rounded-lg border border-slate-200 pointer-events-none flex items-center gap-1 shadow-sm">
                <Move size={12} className="text-sky-600" />
                Arraste com o dedo ou mouse
              </div>
            </div>

            {/* Controle de Zoom */}
            <div className="w-full flex items-center justify-center gap-3 px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl">
              <ZoomOut size={16} className="text-slate-500" />
              <input
                type="range"
                min="0.6"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-44 sm:w-56 accent-sky-500 cursor-pointer"
              />
              <ZoomIn size={16} className="text-slate-500" />
            </div>

            {/* Nome do Personagem */}
            <div className="w-full">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Nome ou Apelido <span className="text-rose-600">* (Obrigatório)</span>:
              </label>
              <input
                type="text"
                required
                maxLength={30}
                placeholder="Ex: Tio Zé, Pelé, Neymar..."
                value={characterName}
                onChange={(e) => {
                  setCharacterName(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
              />
            </div>

            {/* Botões de Ação */}
            <div className="w-full flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setImageSrc(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase border border-slate-200 transition-all cursor-pointer"
              >
                Trocar Imagem
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isUploading || !characterName.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_3px_0_#059669] transition-all active:translate-y-0.5 cursor-pointer"
              >
                <Check size={16} />
                {isUploading ? 'Salvando...' : 'Salvar Cara'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
