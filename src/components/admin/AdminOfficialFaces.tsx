import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin';
import type { SavedFace } from '../../services/auth';
import type { Character } from '../../types/game';
import { Button } from '../ui/Button';
import { ImageCropperModal } from '../ImageCropperModal';
import { sounds } from '../../utils/sound';

export const AdminOfficialFaces: React.FC = () => {
  const [faces, setFaces] = useState<SavedFace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [editingFaceId, setEditingFaceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const loadFaces = async () => {
    setLoading(true);
    const data = await adminService.getOfficialFaces();
    setFaces(data);
    setLoading(false);
  };

  useEffect(() => {
    loadFaces();
  }, []);

  const handleSaveCroppedFace = async (newChar: Character) => {
    if (!newChar.imageUrl || !newChar.name.trim()) return;
    sounds.playWin();
    setIsCropperOpen(false);

    await adminService.saveOfficialFace(newChar.name, newChar.imageUrl);
    loadFaces();
  };

  const handleRenameFace = async (faceId: string, oldImage: string) => {
    const clean = editingName.trim().slice(0, 20);
    if (!clean) return;
    sounds.playClick();

    await adminService.saveOfficialFace(clean, oldImage, faceId);
    setEditingFaceId(null);
    loadFaces();
  };

  const handleDeleteFace = async (face: SavedFace) => {
    if (!window.confirm(`Tem certeza que deseja excluir a cara oficial "${face.name}"?`)) {
      return;
    }
    sounds.playClick();
    await adminService.deleteOfficialFace(face.id, face.name);
    loadFaces();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Topo com Título e Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2DACD]">
        <div>
          <h2 className="font-serif text-2xl text-[#2B2420]">
            Caras Oficiais do Jogo
          </h2>
          <p className="text-xs text-[#6F655C] mt-0.5">
            Personagens oficiais pertencentes ao acervo Tá na Cara!, disponíveis para baralhos oficiais e para a comunidade.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            sounds.playClick();
            setIsCropperOpen(true);
          }}
        >
          Criar Cara Oficial
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#6F655C]">
          Carregando caras oficiais...
        </div>
      ) : faces.length === 0 ? (
        <div className="bg-white border border-[#E2DACD] rounded-2xl p-10 text-center space-y-3">
          <h3 className="font-serif text-base text-[#2B2420]">
            Nenhuma cara oficial cadastrada ainda
          </h3>
          <p className="text-xs text-[#6F655C] max-w-sm mx-auto">
            Cadastre as primeiras fotos oficiais do jogo para compor baralhos e enriquecer as partidas.
          </p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsCropperOpen(true)}
          >
            Cadastrar Primeira Cara Oficial
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {faces.map((face) => (
            <div
              key={face.id}
              className="p-2 rounded-xl border border-[#E2DACD] bg-white flex flex-col items-center text-center relative group min-h-[160px] justify-between shadow-2xs hover:border-[#2B2420]/40 transition-colors"
            >
              <div className="w-full aspect-square rounded-lg overflow-hidden bg-[#F6F2EA] mb-1.5 relative border border-[#E2DACD]/60">
                <img
                  src={face.image_url}
                  alt={face.name}
                  className="w-full h-full object-cover"
                />

                <button
                  type="button"
                  onClick={() => handleDeleteFace(face)}
                  title="Excluir cara"
                  className="absolute top-1 right-1 px-1.5 py-0.5 bg-white/90 hover:bg-rose-50 rounded text-[11px] font-bold text-[#6F655C] hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                >
                  Excluir
                </button>
              </div>

              {editingFaceId === face.id ? (
                <div className="w-full p-1 bg-white rounded border border-[#2B2420]">
                  <input
                    type="text"
                    maxLength={20}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value.slice(0, 20))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRenameFace(face.id, face.image_url);
                      }
                    }}
                    autoFocus
                    className="w-full text-xs font-sans border-0 outline-none p-0 text-[#2B2420] text-center"
                  />
                  <button
                    onClick={() => handleRenameFace(face.id, face.image_url)}
                    className="text-[10px] font-bold text-[#B4532F] mt-1 block w-full text-right"
                  >
                    Salvar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingFaceId(face.id);
                    setEditingName(face.name);
                  }}
                  title="Clique para renomear"
                  className="w-full text-xs font-sans font-bold text-[#2B2420] truncate hover:text-[#B4532F] text-center"
                >
                  {face.name}
                </button>
              )}

              <span className="text-[10px] text-[#A39A90] mt-0.5">
                Oficial
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Recorte para Nova Cara Oficial */}
      {isCropperOpen && (
        <ImageCropperModal
          roomCode="admin_faces"
          onSaveCharacter={handleSaveCroppedFace}
          onClose={() => setIsCropperOpen(false)}
        />
      )}
    </div>
  );
};
