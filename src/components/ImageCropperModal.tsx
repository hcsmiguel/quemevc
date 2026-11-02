import { useState, useRef, useEffect, type FC, type ChangeEvent, type DragEvent } from 'react';
import { supabase } from '../services/supabase';
import { Upload, X, Check, ZoomIn, ZoomOut, Move, Scissors } from 'lucide-react';
import { sounds } from '../utils/sound';
import type { Character } from '../types/game';

interface ImageCropperModalProps {
  onSaveCharacter: (character: Character) => void;
  onClose: () => void;
  initialIndex?: number;
  roomCode?: string;
}

export const ImageCropperModal: FC<ImageCropperModalProps> = ({
  onSaveCharacter,
  onClose,
  initialIndex = 1,
  roomCode = 'temp',
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const processFile = (file: File) => {
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
    ctx.roundRect(15, 15, size - 30, size - 30, 28);
    ctx.clip();

    const scale = (size / Math.min(img.width, img.height)) * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (size - drawW) / 2 + offset.x;
    const drawY = (size - drawH) / 2 + offset.y;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(15, 15, size - 30, size - 30, 28);
    ctx.stroke();
  };

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

      const finalName = characterName.trim() || `Personagem #${initialIndex}`;
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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-indigo-500/70 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Scissors size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Criar Cara Personalizada</h3>
              <p className="text-xs text-slate-400">Cole (Ctrl+V), arraste ou escolha uma imagem</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/60 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {!imageSrc ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-indigo-500/50 hover:border-indigo-400 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/80 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload size={32} />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Arraste uma foto aqui ou cole (Ctrl+V)</h4>
            <p className="text-xs text-slate-400 mb-4 max-w-xs">
              Você pode copiar qualquer imagem da internet e colar com Ctrl+V aqui direto!
            </p>

            <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95">
              Escolher do Computador
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative cursor-move select-none rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <canvas ref={canvasRef} className="block" />
              <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-[10px] text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700 pointer-events-none flex items-center gap-1">
                <Move size={12} />
                Arraste para ajustar posição
              </div>
            </div>

            <div className="w-full flex items-center justify-center gap-3 px-2">
              <ZoomOut size={16} className="text-slate-400" />
              <input
                type="range"
                min="0.6"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-48 accent-indigo-500 cursor-pointer"
              />
              <ZoomIn size={16} className="text-slate-400" />
            </div>

            <div className="w-full">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Nome ou Apelido (Opcional):
              </label>
              <input
                type="text"
                placeholder={`Ex: Tio Zé, Amor, Personagem #${initialIndex}`}
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="w-full flex items-center gap-3 pt-2">
              <button
                onClick={() => setImageSrc(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase transition-all"
              >
                Trocar Imagem
              </button>
              <button
                onClick={handleSave}
                disabled={isUploading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
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
