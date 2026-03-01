

export type AttributeName = 'AGI' | 'FOR' | 'INT' | 'PRE' | 'VIG';

export interface User {
  id: string;
  username: string;
  isGlobalAdmin?: boolean; // Derived from username 'admin'
  email?: string;
  emailVerified?: boolean;
  avatarUrl?: string;
}

export interface CampaignMember {
  id: string;
  campaignId: string;
  userId: string;
  role: 'GM' | 'PLAYER';
  addedAt: number;
  username?: string; // Joined for display
}

export interface Attribute {
  name: AttributeName;
  value: number;
}

export interface Skill {
  name: string;
  value: number; // 0, 5, 10, 15 etc. (Treinamento)
  bonus?: number; // Bônus manual (Itens, buffs, outros)
  attribute: AttributeName;
  other?: string; // Campo para texto extra (ex: qual profissão)
}

export interface Item {
  id: string;
  name: string;
  description: string;
  weight: number;
  category: string;
  quantity: number;
  
  // New Prestige Category (0-4)
  itemCategory?: number;

  // Weapon Specifics
  damage?: string; // Legacy field
  
  // New Saved Dice Config
  diceQty?: number;
  diceFace?: number;
  diceBonus?: number;

  weaponType?: string; // Corpo a corpo, Disparo, etc.
  criticalRange?: string; // 19, 20
  criticalMultiplier?: string; // x2, x3
  range?: string; // Curto, Medio, Longo
  grip?: string; // Uma mão, Duas mãos, Leve

  // Shield Specifics
  defense?: number;
}

export interface Ritual {
  id: string;
  name: string;
  element: 'Conhecimento' | 'Energia' | 'Morte' | 'Sangue' | 'Medo';
  circle: number;
  cost: string;
  range: string;
  duration: string;
  execution: string;
  resistance: string;
  target?: string;
  description: string;
  damage?: string;
  dt?: string; // Dificuldade do Teste
}

export interface Power {
  id: string;
  name: string;
  type: 'Classe' | 'Origem' | 'Conhecimento' | 'Energia' | 'Morte' | 'Sangue' | 'Habilidade de classe' | 'Habilidade de trilha';
  description: string;
}

export interface Document {
  id: string;
  name: string;
  location: string;
  date: string;
  description: string;
  link: string;
  isShared?: boolean; // Legacy simple toggle
  
  // New robust sharing
  sharedWith?: string[]; // IDs dos personagens que receberam acesso visual
  isPublic?: boolean; // Se true, aparece na aba Evidências para todos
}

// Arquivo Centralizado na Campanha
export interface CampaignArchive {
  id: string;
  name: string;
  location: string;
  date: string;
  description: string;
  link: string;
  
  // Controle de Acesso
  holders: string[]; // IDs dos personagens que possuem o item físico (inventário)
  sharedWith: string[]; // IDs dos personagens que receberam acesso visual (compartilhado por um holder)
  isPublic: boolean; // Se true, aparece na aba Evidências para todos
}

export interface SharedDocument extends Document {
  ownerName: string;
  characterId: string;
}

export interface RuleBlock {
  id: string;
  title: string;
  content: string;
}

export interface DMNote {
  id: string;
  title: string;
  content: string;
  color: 'purple' | 'green' | 'blood' | 'yellow' | 'gray';
  colSpan?: number;
  rowSpan?: number;
}

export interface CombatEntry {
  characterId: string;
  name: string;
  initiative: number; // Valor Total
  originalRoll: number; // Valor do Dado
  bonus: number; // Modificador usado
  type?: 'PLAYER' | 'MONSTER'; // Identificador
}

// --- MAP SYSTEM ---
export interface MapToken {
  id: string; // characterId or unique monster id
  type: 'PLAYER' | 'MONSTER';
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  label: string;
  imageUrl: string;
  size: number; // Scale multiplier (default 1)
  flip?: boolean; // Mirror Image
  rotation?: number; // Degrees
  variant?: 1 | 2 | 3; // 1=Main, 2=Variant, 3=Fallen
  visible?: boolean; // Visibility toggle (Default true for players, false for monsters usually)
}

export interface MapFogShape {
  id: string;
  x: number; // %
  y: number; // %
  width: number; // %
  height: number; // %
}

export interface MapConfig {
  imageUrl: string;
  tokens: MapToken[];
  fogShapes?: MapFogShape[]; // New: Areas hidden from players
  allowedPlayers: string[]; // IDs of characters allowed to see map
  // Configuração do Sistema movida para cá para compatibilidade com JSONB
  system?: 'DETERMINATION' | 'SANITY_EFFORT'; 
}

export interface MapScene {
  id: string;
  campaignId: string;
  name: string;
  config: MapConfig;
  createdAt?: number;
}

export interface Campaign {
  id: string;
  name: string;
  adminName: string;
  adminPasswordHash: string; // Deprecated but kept for schema compatibility
  playerPasswordHash?: string; // Deprecated but kept for schema compatibility
  ownerId?: string; // Links to Users table (CREATOR/ADMIN)
  gmId?: string; // Links to Users table (GAME MASTER/NARRATOR)
  summary: string;
  manual: RuleBlock[]; 
  gmNotes?: string; // Notas gerais (texto corrido)
  dmScreen?: DMNote[]; // Post-its modulares
  archives?: CampaignArchive[]; // Arquivos centralizados do Mestre
  
  // Combate
  isCombatActive?: boolean;
  combatInitiatives?: CombatEntry[];

  // Mapa (e configs gerais extras)
  mapConfig?: MapConfig;

  createdAt: number;
}

export interface Character {
  id: string;
  campaignId: string; 
  name: string;
  player: string;
  ownerId?: string; // NEW: Links to Users table
  imageUrl?: string; // URL da foto do personagem
  
  // Token Variants
  tokenUrl?: string; // Main Token (1)
  tokenUrl2?: string; // Variant Token (2)
  tokenUrl3?: string; // Fallen/Dead Token (3)
  
  age: number;
  nex: number; 
  origin: string;
  class: string;
  trail?: string; // Trilha (ex: Aniquilador, Graduado)
  patent: string; 
  
  // Stats
  attributes: Record<AttributeName, number>;
  
  // Vitals
  pv: { current: number; max: number }; 
  pe: { current: number; max: number }; 
  san: { current: number; max: number }; 
  
  // Stats Bonus
  defenseBonus?: number; // "Outros" na defesa
  loadBonus?: number; // Bônus de Carga Manual

  history: string;
  
  // Collections
  skills: Skill[];
  inventory: Item[];
  rituals: Ritual[];
  powers: Power[];
  documents: Document[]; 
  
  // Security
  passwordHash: string; // Deprecated but kept for schema compatibility
  createdAt: number;
  updatedAt: number;

  // Admin Control
  hidden?: boolean; // Se true, visível apenas para o mestre
}

export interface CharacterSummary {
  id: string;
  campaignId: string;
  name: string;
  player: string;
  ownerId?: string; // NEW
  ownerUsername?: string; // NEW: Display name of the owner
  imageUrl?: string;
  tokenUrl?: string;
  tokenUrl2?: string;
  tokenUrl3?: string;
  class: string;
  nex: number;
  origin: string;
  hidden?: boolean; // Added summary field
}