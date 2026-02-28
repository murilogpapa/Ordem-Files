import React from 'react';
import { CharacterSummary } from '../types';
import { User, FileText, Star, Eye, EyeOff, UserCog } from 'lucide-react';

interface Props {
  data: CharacterSummary;
  onClick: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isAdmin?: boolean;
  onToggleHidden?: () => void;
  onAssignPlayer?: () => void; // New prop for assigning ownership
}

export const CharacterCard: React.FC<Props> = ({ data, onClick, isFavorite, onToggleFavorite, isAdmin, onToggleHidden, onAssignPlayer }) => {
  
  // Helper to determine the top bar color and glow based on class
  const getClassStyle = (cls: string) => {
    switch (cls) {
      case 'Combatente': 
        return 'bg-ordem-blood shadow-[0_0_15px_rgba(183,0,44,0.6)]';
      case 'Especialista': 
        return 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]';
      case 'Ocultista': 
        return 'bg-ordem-purple shadow-[0_0_15px_rgba(124,58,237,0.6)]';
      case 'Sobrevivente':
        return 'bg-[#5d7c3d] shadow-[0_0_15px_rgba(93,124,61,0.6)]';
      default: 
        return 'bg-zinc-600';
    }
  };

  const isHidden = data.hidden;

  return (
    <div 
      onClick={onClick}
      className={`group relative bg-ordem-panel border border-ordem-border p-0 cursor-pointer 
      hover:border-ordem-purple hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all duration-300 overflow-hidden mt-2
      ${isHidden ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' : ''}
      `}
    >
      {/* Hidden Badge */}
      {isHidden && (
          <div className="absolute top-0 right-0 bg-zinc-800 text-zinc-400 text-[9px] px-2 py-1 z-40 font-bold uppercase tracking-widest border-b border-l border-zinc-600 rounded-bl">
              Oculto
          </div>
      )}

      {/* Class Color Top Bar */}
      <div className={`absolute top-0 left-0 w-full h-1 z-20 ${getClassStyle(data.class)}`}></div>

      {/* Hover Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-ordem-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Controls (Favorite & Hide) */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
          {/* Admin: Assign Player */}
          {isAdmin && onAssignPlayer && (
              <button
                  onClick={(e) => {
                      e.stopPropagation();
                      onAssignPlayer();
                  }}
                  className="p-2 rounded-full hover:bg-black/50 transition-colors text-zinc-500 hover:text-white"
                  title="Vincular Jogador (Dono)"
              >
                  <UserCog className="w-5 h-5" />
              </button>
          )}

          {/* Admin Hide Toggle */}
          {isAdmin && onToggleHidden && (
              <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleHidden();
                }}
                className="p-2 rounded-full hover:bg-black/50 transition-colors text-zinc-500 hover:text-white"
                title={isHidden ? "Revelar Ficha" : "Ocultar Ficha"}
              >
                  {isHidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
          )}

          {/* Favorite Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite && onToggleFavorite();
            }}
            className="p-2 rounded-full hover:bg-black/50 transition-colors"
            title={isFavorite ? "Remover dos Favoritos" : "Favoritar Agente"}
          >
            <Star 
              className={`w-5 h-5 transition-all duration-300 ${
                isFavorite 
                  ? "fill-yellow-500 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] scale-110" 
                  : "text-zinc-600 hover:text-yellow-500"
              }`} 
            />
          </button>
      </div>
      
      <div className="p-6 relative z-10 pt-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full animate-pulse ${
                    data.class === 'Combatente' ? 'bg-ordem-blood' : 
                    data.class === 'Especialista' ? 'bg-yellow-500' : 
                    data.class === 'Ocultista' ? 'bg-ordem-purple' : 
                    data.class === 'Sobrevivente' ? 'bg-[#5d7c3d]' : 'bg-ordem-green'
                }`}></span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Arquivo #{data.id.slice(0,4)}</span>
            </div>
            <h3 className="text-2xl font-title font-bold text-white tracking-wide group-hover:text-ordem-purple transition-colors drop-shadow-lg">
              {data.name}
            </h3>
          </div>
          
          <div className="w-16 h-16 border border-ordem-border group-hover:border-ordem-purple/50 transition-colors overflow-hidden bg-black/50 flex items-center justify-center shrink-0 mr-8 md:mr-0">
              {data.imageUrl ? (
                  <img 
                    src={data.imageUrl} 
                    alt={data.name} 
                    className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500"
                    onError={(e) => {
                        // Fallback on error
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement?.classList.add('fallback-icon');
                    }}
                  />
              ) : (
                  <User className="w-8 h-8 text-ordem-muted group-hover:text-ordem-purple" />
              )}
          </div>
        </div>

        <div className="space-y-3 font-tech text-lg text-zinc-400">
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
              <span className="text-xs uppercase text-ordem-muted tracking-widest">Classe</span>
              <span className={`font-bold ${
                  data.class === 'Combatente' ? 'text-ordem-blood' : 
                  data.class === 'Especialista' ? 'text-yellow-500' : 
                  data.class === 'Ocultista' ? 'text-ordem-purple' : 
                  data.class === 'Sobrevivente' ? 'text-[#5d7c3d]' : 'text-white'
              }`}>{data.class}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
              <span className="text-xs uppercase text-ordem-muted tracking-widest">Origem</span>
              <span className="text-white">{data.origin}</span>
          </div>
          <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-ordem-muted tracking-widest">NEX</span>
              <span className="font-bold text-white text-xl">{data.nex}%</span>
          </div>
        </div>
      </div>

      <div className="bg-black/80 px-6 py-3 border-t border-ordem-border flex justify-between items-center relative z-10">
        <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest flex items-center gap-2">
          <FileText className="w-3 h-3" />
          {data.player}
          {data.ownerUsername && data.ownerUsername !== 'admin' && (
              <span className="text-[9px] bg-zinc-900 border border-zinc-700 px-1 rounded ml-1 text-zinc-400">
                  Jog.: {data.ownerUsername}
              </span>
          )}
        </span>
        <span className="text-[10px] font-bold text-ordem-purple uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all">
          Acessar Dossiê &rarr;
        </span>
      </div>
    </div>
  );
};