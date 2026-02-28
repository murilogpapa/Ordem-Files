import React, { useState } from 'react';
import { Character } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { INITIAL_ATTRIBUTES, DEFAULT_SKILLS, CHARACTER_CLASSES, CLASS_COLORS } from '../constants';
import { dbService } from '../services/dbService';

interface Props {
  campaignId: string;
  onCancel: () => void;
  onCreated: () => void;
}

export const CreateSheetWizard: React.FC<Props> = ({ campaignId, onCancel, onCreated }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    player: '',
    origin: '',
    class: '',
    trail: '',
    imageUrl: ''
  });
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!formData.name) {
      setError('Preencha os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const userStr = localStorage.getItem("sessionUser");
      if (!userStr) throw new Error("Usuário não logado.");
      const user = JSON.parse(userStr);

      const newChar: Character = {
        id: crypto.randomUUID(),
        campaignId: campaignId,
        ownerId: user.id, // Assign Creator as Owner
        name: formData.name,
        player: formData.player || user.username,
        imageUrl: formData.imageUrl,
        age: 25,
        nex: 5,
        origin: formData.origin,
        class: formData.class,
        trail: formData.trail,
        patent: 'Recruta',
        attributes: { ...INITIAL_ATTRIBUTES },
        pv: { current: 20, max: 20 },
        pe: { current: 5, max: 5 },
        san: { current: 15, max: 15 },
        history: '',
        skills: JSON.parse(JSON.stringify(DEFAULT_SKILLS)),
        inventory: [],
        rituals: [],
        powers: [],
        documents: [], 
        passwordHash: 'legacy', // Not used in V3.0
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await dbService.createCharacter(newChar);
      onCreated();
    } catch (e) {
      setError('Erro ao criar ficha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-ordem-panel p-8 rounded border border-ordem-border shadow-2xl mt-10">
      <h2 className="text-2xl font-bold text-white mb-6 border-b border-ordem-border pb-4">NOVO AGENTE</h2>
      
      <div className="space-y-4">
        <Input 
          label="Nome do Personagem" 
          value={formData.name} 
          onChange={e => setFormData({...formData, name: e.target.value})} 
          placeholder="Ex: Arthur Cervero"
        />
        
        <Input 
          label="Nome do Jogador" 
          value={formData.player} 
          onChange={e => setFormData({...formData, player: e.target.value})} 
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 w-full group">
              <label className="text-[10px] uppercase tracking-[0.2em] text-ordem-muted font-bold group-focus-within:text-ordem-purple transition-colors font-tech">
                Classe
              </label>
              <select 
                className={`bg-black/40 border-b border-ordem-border rounded-t px-3 py-2 text-ordem-text font-tech text-lg 
                focus:border-ordem-purple focus:ring-0 focus:bg-ordem-purple/5 focus:shadow-[0_4px_10px_-5px_rgba(124,58,237,0.3)]
                outline-none transition-all appearance-none cursor-pointer ${CLASS_COLORS[formData.class] || ''}`}
                value={formData.class}
                onChange={e => setFormData({...formData, class: e.target.value})}
              >
                <option value="" className="text-zinc-500 bg-black">SELECIONE A CLASSE...</option>
                {CHARACTER_CLASSES.map(cls => (
                    <option key={cls} value={cls} className={`bg-black font-bold ${CLASS_COLORS[cls]}`}>
                        {cls}
                    </option>
                ))}
              </select>
          </div>

          <Input 
            label="Origem" 
            value={formData.origin} 
            onChange={e => setFormData({...formData, origin: e.target.value})} 
            placeholder="Ex: Policial"
          />
        </div>
        
        <Input 
            label="Trilha (Opcional)" 
            value={formData.trail} 
            onChange={e => setFormData({...formData, trail: e.target.value})} 
            placeholder="Ex: Aniquilador"
        />

        <Input 
          label="URL da Foto/Avatar" 
          value={formData.imageUrl} 
          onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
          placeholder="https://..."
        />

        {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

        <div className="flex gap-4 pt-4">
           <Button variant="ghost" className="flex-1" onClick={onCancel} disabled={loading}>
             Cancelar
           </Button>
           <Button variant="primary" className="flex-1" onClick={handleCreate} isLoading={loading}>
             Criar Ficha
           </Button>
        </div>
      </div>
    </div>
  );
};