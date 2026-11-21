import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin';
import type { SavedFace } from '../../services/auth';
import { AlertCircle } from 'lucide-react';

export const AdminOfficialFaces: React.FC = () => {
  const [faces, setFaces] = useState<SavedFace[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFaces = async () => {
    setLoading(true);
    try {
      const data = await adminService.getOfficialFaces();
      setFaces(data);
    } catch (err) {
      console.warn('Erro ao carregar banco legado de caras:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaces();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Topo com Título */}
      <div className="pb-4 border-b border-[#E2DACD]">
        <h2 className="font-serif text-2xl text-[#2B2420]">
          Banco de Caras (Legado)
        </h2>
        <p className="text-xs text-[#6F655C] mt-0.5">
          Visualização somente leitura do acervo histórico de caras.
        </p>
      </div>

      {/* Banner Informativo de Descontinuação */}
      <div className="p-4 rounded-xl bg-[#F0EAE1] border border-[#E2DACD] text-[#382C26] text-xs flex items-start gap-3">
        <AlertCircle size={16} className="text-[#B4532F] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-[#2B2420]">
            Descontinuado: use o construtor de baralho
          </p>
          <p className="text-[#6F655C] leading-relaxed">
            O banco separado de caras oficiais foi descontinuado. Todas as novas caras são criadas diretamente pelo construtor de baralhos e registradas no catálogo público com autoria Tá na Cara!, sem qualquer marcação de &quot;oficial&quot;.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#6F655C]">
          Carregando acervo legado...
        </div>
      ) : faces.length === 0 ? (
        <div className="bg-white border border-[#E2DACD] rounded-2xl p-10 text-center space-y-2">
          <h3 className="font-serif text-base text-[#2B2420]">
            Nenhuma cara no acervo legado
          </h3>
          <p className="text-xs text-[#6F655C] max-w-sm mx-auto">
            Todas as cartas do jogo agora residem no catálogo público unificado da comunidade.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {faces.map((face) => (
            <div
              key={face.id}
              className="p-2 rounded-xl border border-[#E2DACD] bg-white flex flex-col items-center text-center shadow-2xs"
            >
              <div className="w-full aspect-square rounded-lg overflow-hidden bg-[#F6F2EA] mb-1.5 border border-[#E2DACD]/60">
                <img
                  src={face.image_url}
                  alt={face.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>

              <span className="w-full text-xs font-sans font-medium text-[#2B2420] truncate">
                {face.name}
              </span>

              <span className="text-[10px] text-[#A39A90] mt-0.5">
                Legado
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
