

import React, { useState } from 'react';
import { Campaign } from '../types';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Input';
import { dbService } from '../services/dbService';
import { Brain, Star } from 'lucide-react';

interface Props {
  onCancel: () => void;
  onCreated: () => void;
}

export const CreateCampaignWizard: React.FC<Props> = ({ onCancel, onCreated }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    adminName: '',
    summary: ''
  });
  const [system, setSystem] = useState<'DETERMINATION' | 'SANITY_EFFORT'>('DETERMINATION');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!formData.name || !formData.adminName) {
      setError('Preencha os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const userStr = localStorage.getItem("sessionUser");
      if (!userStr) throw new Error("Usuário não logado.");
      const user = JSON.parse(userStr);

      const newCampaign: Campaign = {
        id: crypto.randomUUID(),
        name: formData.name,
        adminName: formData.adminName,
        adminPasswordHash: 'legacy', // Not used in V3.0
        playerPasswordHash: 'legacy', // Not used in V3.0
        ownerId: user.id, // Creator is Owner (Admin)
        gmId: user.id, // Creator is also the default GM
        summary: formData.summary,
        manual: [
          {
            id: crypto.randomUUID(),
            title: 'Protocolo Inicial',
            content: 'Descreva aqui as regras da casa, ambientação ou briefing da missão...'
          }
        ],
        gmNotes: '',
        dmScreen: [],
        archives: [],
        mapConfig: {
            imageUrl: '',
            tokens: [],
            allowedPlayers: [],
            system: system 
        },
        createdAt: Date.now()
      };

      await dbService.createCampaign(newCampaign);
      onCreated();
    } catch (e: any) {
      console.error(e);
      setError('Erro ao criar campanha: ' + (e.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-ordem-panel p-8 rounded border border-ordem-border shadow-2xl mt-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-ordem-purple/5 rounded-bl-full pointer-events-none"></div>

      <h2 className="text-3xl font-title font-black text-white mb-1 uppercase">Nova Campanha</h2>
      <p className="text-ordem-muted font-mono text-sm mb-6 uppercase tracking-widest">Iniciando protocolo de nova missão</p>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Input 
                label="Nome da Campanha" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="Ex: O Segredo na Ilha"
                autoFocus
            />
            <Input 
                label="Mestre (Display Name)" 
                value={formData.adminName} 
                onChange={e => setFormData({...formData, adminName: e.target.value})} 
                placeholder="Nome do DM"
            />
        </div>

        <TextArea 
            label="Resumo / Briefing Inicial"
            value={formData.summary}
            onChange={e => setFormData({...formData, summary: e.target.value})}
            placeholder="Breve descrição pública da campanha..."
            className="min-h-[80px]"
        />

        <div className="bg-black/30 p-4 border border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-zinc-500 mb-3 block tracking-widest">Sistema de Regras (Vitals)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                   type="button"
                   onClick={() => setSystem('DETERMINATION')}
                   className={`p-4 border text-left transition-all relative overflow-hidden group ${system === 'DETERMINATION' ? 'bg-ordem-purple/10 border-ordem-purple' : 'bg-black border-zinc-700 hover:border-zinc-500'}`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <Star className={`w-5 h-5 ${system === 'DETERMINATION' ? 'text-ordem-purple' : 'text-zinc-500'}`} />
                        <span className={`font-bold uppercase text-sm ${system === 'DETERMINATION' ? 'text-white' : 'text-zinc-400'}`}>Determinação</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                        Sistema simplificado. Usa Pontos de Determinação para ativar habilidades e resistir ao paranormal.
                    </p>
                </button>

                <button 
                   type="button"
                   onClick={() => setSystem('SANITY_EFFORT')}
                   className={`p-4 border text-left transition-all relative overflow-hidden group ${system === 'SANITY_EFFORT' ? 'bg-ordem-green/10 border-ordem-green' : 'bg-black border-zinc-700 hover:border-zinc-500'}`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <Brain className={`w-5 h-5 ${system === 'SANITY_EFFORT' ? 'text-ordem-green' : 'text-zinc-500'}`} />
                        <span className={`font-bold uppercase text-sm ${system === 'SANITY_EFFORT' ? 'text-white' : 'text-zinc-400'}`}>Sanidade & Esforço</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                        Sistema clássico. Separa Pontos de Esforço (PE) para habilidades e Sanidade (SAN) para dano mental.
                    </p>
                </button>
            </div>
        </div>

        {error && <p className="text-red-500 text-sm font-bold text-center animate-pulse">{error}</p>}

        <div className="flex gap-4 pt-4 border-t border-white/5">
           <Button variant="ghost" className="flex-1" onClick={onCancel} disabled={loading}>
             Abortar
           </Button>
           <Button variant="primary" className="flex-1" onClick={handleCreate} isLoading={loading}>
             Inicializar Missão
           </Button>
        </div>
      </div>
    </div>
  );
};