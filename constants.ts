import { AttributeName, Skill } from './types';

export const ELEMENTS = {
  Conhecimento: 'text-yellow-500 drop-shadow-[0_0_5px_rgba(0,255,157,0.8)]',
  Energia: 'text-ordem-purple drop-shadow-[0_0_5px_rgba(124,58,237,0.8)]',
  Morte: 'text-zinc-500',
  Sangue: 'text-ordem-blood drop-shadow-[0_0_5px_rgba(183,0,44,0.8)]',
  Medo: 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]',
};

export const CHARACTER_CLASSES = ["Combatente", "Especialista", "Ocultista", "Sobrevivente"];

export const CLASS_COLORS: Record<string, string> = {
  "Combatente": "text-ordem-blood border-ordem-blood",
  "Especialista": "text-yellow-500 border-yellow-500",
  "Ocultista": "text-ordem-purple border-ordem-purple",
  "Sobrevivente": "text-[#5d7c3d] border-[#5d7c3d]", // Verde Musgo
  // Fallback
  "default": "text-ordem-green border-ordem-green"
};

export const POWER_TYPES = {
  Classe: 'text-zinc-300 border-zinc-500',
  Origem: 'text-zinc-300 border-zinc-500',
  'Habilidade de classe': 'text-zinc-200 border-zinc-400',
  'Habilidade de trilha': 'text-zinc-100 border-zinc-300',
  Conhecimento: 'text-yellow-500 border-yellow-500',
  Energia: 'text-ordem-purple border-ordem-purple',
  Morte: 'text-zinc-500 border-zinc-500',
  Sangue: 'text-ordem-blood border-ordem-blood',
};

export const ITEM_CATEGORIES = [
  "ARMA",
  "ESCUDO",
  "EQUIPAMENTOS",
  "MOCHILA MILITAR",
  "ITEM PARANORMAL",
  "OUTROS"
];

export const WEAPON_TYPES = [
  "Corpo a corpo",
  "Ataque a distância",
  "Arremesso",
  "Disparo",
  "Fogo"
];

export const WEAPON_RANGES = [
  "-",
  "Curto",
  "Médio",
  "Longo",
  "Extremo"
];

export const WEAPON_GRIPS = [
  "Leve",
  "Uma mão",
  "Duas mãos"
];

// --- RITUAL CONSTANTS ---

export const RITUAL_COSTS: Record<number, string> = {
  1: '1',
  2: '3',
  3: '6',
  4: '10'
};

export const RITUAL_RANGES = [
  "pessoal",
  "toque",
  "curto",
  "médio",
  "longo",
  "extremo",
  "ilimitado"
];

export const RITUAL_EXECUTIONS = [
  "livre",
  "reação",
  "padrão",
  "completa"
];

// --- SKILLS DATA ---

export const TRAINING_REQUIRED_SKILLS = [
  "Adestramento",
  "Artes",
  "Ciências",
  "Crime",
  "Ocultismo",
  "Pilotagem",
  "Profissão",
  "Tática",
  "Tecnologia",
  "Religião"
];

export const INITIAL_ATTRIBUTES: Record<AttributeName, number> = {
  AGI: 1,
  FOR: 1,
  INT: 1,
  PRE: 1,
  VIG: 1,
};

export const DEFAULT_SKILLS: Skill[] = [
  { name: 'Acrobacia', value: 0, attribute: 'AGI' },
  { name: 'Adestramento', value: 0, attribute: 'PRE' },
  { name: 'Artes', value: 0, attribute: 'PRE' },
  { name: 'Atletismo', value: 0, attribute: 'FOR' },
  { name: 'Atualidades', value: 0, attribute: 'INT' },
  { name: 'Ciências', value: 0, attribute: 'INT' },
  { name: 'Crime', value: 0, attribute: 'AGI' },
  { name: 'Diplomacia', value: 0, attribute: 'PRE' },
  { name: 'Enganação', value: 0, attribute: 'PRE' },
  { name: 'Fortitude', value: 0, attribute: 'VIG' },
  { name: 'Furtividade', value: 0, attribute: 'AGI' },
  { name: 'Iniciativa', value: 0, attribute: 'AGI' },
  { name: 'Intimidação', value: 0, attribute: 'PRE' },
  { name: 'Intuição', value: 0, attribute: 'PRE' },
  { name: 'Investigação', value: 0, attribute: 'INT' },
  { name: 'Luta', value: 0, attribute: 'FOR' },
  { name: 'Medicina', value: 0, attribute: 'INT' },
  { name: 'Ocultismo', value: 0, attribute: 'INT' },
  { name: 'Percepção', value: 0, attribute: 'PRE' },
  { name: 'Pilotagem', value: 0, attribute: 'AGI' },
  { name: 'Pontaria', value: 0, attribute: 'AGI' },
  { name: 'Profissão', value: 0, attribute: 'INT' },
  { name: 'Reflexos', value: 0, attribute: 'AGI' },
  { name: 'Religião', value: 0, attribute: 'PRE' },
  { name: 'Sobrevivência', value: 0, attribute: 'INT' },
  { name: 'Tática', value: 0, attribute: 'INT' },
  { name: 'Tecnologia', value: 0, attribute: 'INT' },
  { name: 'Vontade', value: 0, attribute: 'PRE' },
];