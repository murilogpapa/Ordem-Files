





import React, { useState, useEffect, useRef } from 'react';
import { Character, AttributeName, Item, Ritual, Power, Document, SharedDocument, CampaignArchive, CharacterSummary, Campaign, CombatEntry } from '../types';
import { Input, TextArea } from './ui/Input';
import { Button } from './ui/Button';
import { dbService } from '../services/dbService';
import { Save, Trash2, Plus, X, Sword, BookOpen, Backpack, Activity, ArrowLeft, Skull, Brain, Zap, Ghost, Heart, Crosshair, Hash, Weight, FileText, Calendar, MapPin, Link as LinkIcon, Paperclip, MousePointer2, Target, AlertCircle, Shield, Maximize2, Dices, HelpCircle, Share2, Eye, User, AlertTriangle, Briefcase, Globe, Lock, FolderOpen, Calculator, Delete, Diamond, KeyRound, CheckCircle, Map as MapIcon, ChevronUp, ChevronDown, Layers, Calculator as CalcIcon, Star, Move } from 'lucide-react';
import { ELEMENTS, POWER_TYPES, ITEM_CATEGORIES, WEAPON_TYPES, WEAPON_RANGES, WEAPON_GRIPS, RITUAL_COSTS, RITUAL_RANGES, RITUAL_EXECUTIONS, TRAINING_REQUIRED_SKILLS, CHARACTER_CLASSES, CLASS_COLORS } from '../constants';
import { MapView } from './MapView';

interface Props {
  character: Character;
  onBack: () => void;
  onUpdate: (updated: Character) => void;
  onDelete: () => void;
}

interface RollResult {
    id: number;
    label: string;
    dice: string;
    rolls: number[];
    skillBonus: number;
    extraBonus: number;
    mode: 'highest' | 'sum';
    total: number;
}

const TABS = [
  { id: 'main', label: 'Dossiê', icon: Activity },
  { id: 'skills', label: 'Perícias', icon: BookOpen },
  { id: 'inventory', label: 'Inventário', icon: Backpack },
  { id: 'rituals', label: 'Paranormal', icon: Ghost },
  { id: 'powers', label: 'Poderes', icon: Zap },
  { id: 'documents', label: 'Documentos', icon: FileText }, 
  { id: 'map', label: 'Mapa', icon: MapIcon },
];

const ATTRIBUTE_GROUPS: AttributeName[] = ['AGI', 'FOR', 'INT', 'PRE', 'VIG'];

const ATTRIBUTE_LABELS: Record<AttributeName, { label: string, color: string, border: string }> = {
    'AGI': { label: 'Agilidade', color: 'text-yellow-500', border: 'border-yellow-500' },
    'FOR': { label: 'Força', color: 'text-red-500', border: 'border-red-500' },
    'INT': { label: 'Intelecto', color: 'text-blue-500', border: 'border-blue-500' },
    'PRE': { label: 'Presença', color: 'text-purple-500', border: 'border-purple-500' },
    'VIG': { label: 'Vigor', color: 'text-green-500', border: 'border-green-500' }
};

export const CharacterSheet: React.FC<Props> = ({ character, onBack, onUpdate, onDelete }) => {
  const [data, setData] = useState<Character>(character);
  const [activeTab, setActiveTab] = useState('main');
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(isDirty); // Ref to track status in async callbacks without re-render
  const [isSaving, setIsSaving] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); 
  
  // UI States
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false); 

  // New File System States
  const [campaignArchives, setCampaignArchives] = useState<CampaignArchive[]>([]);
  const [sharingArchive, setSharingArchive] = useState<CampaignArchive | Document | null>(null); // Modified to accept Document too
  const [campaignAgents, setCampaignAgents] = useState<CharacterSummary[]>([]);
  
  // Combat State
  const [isCombatActive, setIsCombatActive] = useState(false);
  const [combatInitiatives, setCombatInitiatives] = useState<CombatEntry[]>([]);
  const [showCombatModal, setShowCombatModal] = useState(false);
  const [manualInitInput, setManualInitInput] = useState('');

  // Dice Roller State
  const [diceQty, setDiceQty] = useState(1);
  const [selectedSkillName, setSelectedSkillName] = useState<string>('');
  const [rollMode, setRollMode] = useState<'highest' | 'sum'>('highest');
  const [extraRollBonus, setExtraRollBonus] = useState(0);
  const [rollHistory, setRollHistory] = useState<RollResult[]>([]);

  // Calculator State
  const [calcDisplay, setCalcDisplay] = useState('');

  // Local state for last roll results on weapons (visual only, not saved in DB)
  const [weaponLastResults, setWeaponLastResults] = useState<Record<number, RollResult>>({});

  // Full Campaign State (For Map)
  const [campaignFullData, setCampaignFullData] = useState<Campaign | null>(null);

  // Refs
  const historyRef = useRef<HTMLTextAreaElement>(null);

  // Sync ref with state
  useEffect(() => {
      isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Realtime Subscriptions & Data Load
  useEffect(() => {
    loadCampaignData();

    // 1. Subscribe to changes on THIS character
    const charSub = dbService.subscribeToCharacter(character.id, (newData) => {
        // Only update if user is NOT editing currently to prevent overwriting
        if (!isDirtyRef.current) {
            setData(newData);
        }
    });

    // 2. Subscribe to Campaign changes (for Archives updates AND Combat)
    const campSub = dbService.subscribeToCampaign(character.campaignId, (campData) => {
        // Campaign archives can be updated safely as they are mostly separate from char sheet edits
        setCampaignArchives(campData.archives || []);
        
        // Update Combat Status
        setIsCombatActive(campData.isCombatActive || false);
        setCombatInitiatives(campData.combatInitiatives || []);

        setCampaignFullData(campData);
    });

    return () => {
        charSub.unsubscribe();
        campSub.unsubscribe();
    };
  }, [character.id, character.campaignId]);

  // Auto-resize history textarea on load and tab change
  useEffect(() => {
      if (activeTab === 'main' && historyRef.current) {
          historyRef.current.style.height = 'auto';
          historyRef.current.style.height = historyRef.current.scrollHeight + 'px';
      }
  }, [activeTab, data.history]);

  const loadCampaignData = async () => {
      const camp = await dbService.getCampaignById(character.campaignId);
      if (camp) {
          setCampaignArchives(camp.archives || []);
          setIsCombatActive(camp.isCombatActive || false);
          setCombatInitiatives(camp.combatInitiatives || []);
          setCampaignFullData(camp);
      }
      
      const agents = await dbService.listCharacters(character.campaignId);
      setCampaignAgents(agents.filter(a => a.id !== character.id)); // Exclude self
  }

  // Handle generic field changes
  const handleChange = (field: keyof Character, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleNestedChange = (parent: 'pv' | 'pe' | 'san', field: 'current' | 'max', value: number) => {
    setData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
    setIsDirty(true);
  };

  const handleAttributeChange = (attr: AttributeName, value: number) => {
    setData(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [attr]: value }
    }));
    setIsDirty(true);
  };

  const handleSkillChange = (skillName: string, value: number) => {
    const index = data.skills.findIndex(s => s.name === skillName);
    if (index === -1) return;

    const newSkills = [...data.skills];
    newSkills[index] = { ...newSkills[index], value: value };
    setData(prev => ({ ...prev, skills: newSkills }));
    setIsDirty(true);
  };

  const handleSkillBonusChange = (skillName: string, bonus: number) => {
    const index = data.skills.findIndex(s => s.name === skillName);
    if (index === -1) return;

    const newSkills = [...data.skills];
    newSkills[index] = { ...newSkills[index], bonus: bonus };
    setData(prev => ({ ...prev, skills: newSkills }));
    setIsDirty(true);
  };

  const handleSkillOtherChange = (skillName: string, text: string) => {
    const index = data.skills.findIndex(s => s.name === skillName);
    if (index === -1) return;

    const newSkills = [...data.skills];
    newSkills[index] = { ...newSkills[index], other: text };
    setData(prev => ({ ...prev, skills: newSkills }));
    setIsDirty(true);
  };

  // Inventory Logic
  const addItem = () => {
    const newItem: Item = {
      id: crypto.randomUUID(),
      name: 'Item Desconhecido',
      description: '',
      weight: 1,
      category: 'EQUIPAMENTOS',
      itemCategory: 0,
      quantity: 1,
      // Saved Dice Config (Default 1d6)
      diceQty: 1,
      diceFace: 6,
      diceBonus: 0,
      criticalRange: '20',
      criticalMultiplier: '', 
      weaponType: 'Corpo a corpo',
      range: 'Curto',
      grip: 'Uma mão',
      defense: 0
    };
    setData(prev => ({ ...prev, inventory: [...prev.inventory, newItem] }));
    setIsDirty(true);
  };

  const updateItem = (index: number, field: keyof Item, value: any) => {
    const newInv = [...data.inventory];
    let updatedItem = { ...newInv[index], [field]: value };

    // Lógica da Mochila Militar
    if (field === 'category' && value === 'MOCHILA MILITAR') {
        updatedItem.weight = 0;
        updatedItem.itemCategory = 1; // Tier I
        updatedItem.description = 'Uma mochila leve e de alta qualidade.';
        updatedItem.name = 'Mochila Militar';
    }

    newInv[index] = updatedItem;
    setData(prev => ({ ...prev, inventory: newInv }));
    setIsDirty(true);
  };

  const removeItem = (index: number) => {
    setData(prev => ({ ...prev, inventory: prev.inventory.filter((_, i) => i !== index) }));
    setIsDirty(true);
  };

  // Ritual Logic
  const addRitual = () => {
    const newRitual: Ritual = {
      id: crypto.randomUUID(),
      name: 'Manifestação',
      element: 'Conhecimento',
      circle: 1,
      cost: '1', 
      range: 'curto',
      duration: 'Instantânea',
      execution: 'padrão',
      resistance: '',
      target: '',
      description: '',
      damage: '',
      dt: ''
    };
    setData(prev => ({ ...prev, rituals: [...prev.rituals, newRitual] }));
    setIsDirty(true);
  };

  const updateRitual = (index: number, field: keyof Ritual, value: any) => {
    const newRituals = [...data.rituals];
    const updatedRitual = { ...newRituals[index], [field]: value };

    // Auto-update Cost when Circle changes
    if (field === 'circle') {
        updatedRitual.cost = RITUAL_COSTS[value as number] || '1';
    }

    newRituals[index] = updatedRitual;
    setData(prev => ({ ...prev, rituals: newRituals }));
    setIsDirty(true);
  };

  const removeRitual = (index: number) => {
    setData(prev => ({ ...prev, rituals: prev.rituals.filter((_, i) => i !== index) }));
    setIsDirty(true);
  };

  // Powers Logic
  const addPower = () => {
    const newPower: Power = {
      id: crypto.randomUUID(),
      name: 'Novo Poder',
      type: 'Classe',
      description: ''
    };
    const currentPowers = data.powers || [];
    setData(prev => ({ ...prev, powers: [...currentPowers, newPower] }));
    setIsDirty(true);
  };

  const updatePower = (index: number, field: keyof Power, value: any) => {
    const currentPowers = data.powers || [];
    const newPowers = [...currentPowers];
    newPowers[index] = { ...newPowers[index], [field]: value };
    setData(prev => ({ ...prev, powers: newPowers }));
    setIsDirty(true);
  };

  const removePower = (index: number) => {
    const currentPowers = data.powers || [];
    setData(prev => ({ ...prev, powers: currentPowers.filter((_, i) => i !== index) }));
    setIsDirty(true);
  };

  // Personal Documents Logic (Legacy/Personal Notes)
  const addDocument = () => {
    const newDoc: Document = {
      id: crypto.randomUUID(),
      name: 'Nova Nota Pessoal',
      location: '',
      date: '',
      description: '',
      link: '',
      isShared: false,
      sharedWith: [],
      isPublic: false
    };
    const currentDocs = data.documents || [];
    setData(prev => ({ ...prev, documents: [...currentDocs, newDoc] }));
    setIsDirty(true);
  };

  const updateDocument = (index: number, field: keyof Document, value: any) => {
    const currentDocs = data.documents || [];
    const newDocs = [...currentDocs];
    newDocs[index] = { ...newDocs[index], [field]: value };
    setData(prev => ({ ...prev, documents: newDocs }));
    setIsDirty(true);
  };

  const removeDocument = (index: number) => {
    const currentDocs = data.documents || [];
    setData(prev => ({ ...prev, documents: currentDocs.filter((_, i) => i !== index) }));
    setIsDirty(true);
  };

  // --- SHARING LOGIC (Unified for Archives and Documents) ---

  const handleShareChange = async (targetId: string, isPublic: boolean = false) => {
      if (!sharingArchive) return;
      
      // Check if it is a Campaign Archive (has 'holders') or Personal Document (no 'holders')
      const isPersonalDoc = !('holders' in sharingArchive);

      if (isPersonalDoc) {
          // Handle Personal Document Share Update
          const docs = [...data.documents];
          const index = docs.findIndex(d => d.id === sharingArchive.id);
          if (index === -1) return;

          const updatedDoc = { ...docs[index] };
          updatedDoc.sharedWith = updatedDoc.sharedWith || [];

          if (isPublic) {
              updatedDoc.isPublic = !updatedDoc.isPublic;
              // Also toggle legacy field for compatibility if needed
              updatedDoc.isShared = updatedDoc.isPublic;
          } else {
              if (updatedDoc.sharedWith.includes(targetId)) {
                  updatedDoc.sharedWith = updatedDoc.sharedWith.filter(id => id !== targetId);
              } else {
                  updatedDoc.sharedWith.push(targetId);
              }
          }

          docs[index] = updatedDoc;
          setData(prev => ({ ...prev, documents: docs }));
          setSharingArchive(updatedDoc);
          setIsDirty(true);
      } else {
          // Handle Campaign Archive Share Update
          const archives = [...campaignArchives];
          const index = archives.findIndex(a => a.id === sharingArchive.id);
          if (index === -1) return;

          const updatedArchive = { ...archives[index] };

          if (isPublic) {
              updatedArchive.isPublic = !updatedArchive.isPublic;
          } else {
              if (updatedArchive.sharedWith.includes(targetId)) {
                  updatedArchive.sharedWith = updatedArchive.sharedWith.filter(id => id !== targetId);
              } else {
                  updatedArchive.sharedWith.push(targetId);
              }
          }

          archives[index] = updatedArchive;
          setCampaignArchives(archives);
          setSharingArchive(updatedArchive);

          try {
              await dbService.updateCampaignArchives(data.campaignId, archives);
          } catch (e) {
              console.error("Error updating shares", e);
          }
      }
  };

  // Dice Logic
  const rollDice = (sides: number, overrideQty?: number, overrideBonus?: number, overrideLabel?: string): RollResult => {
      const qty = overrideQty !== undefined ? overrideQty : Math.max(1, Math.min(20, diceQty));
      
      // Determine bonus based on selected skill or override
      let skillBonus = 0;
      let label = overrideLabel || `Rolagem d${sides}`;

      if (overrideBonus !== undefined) {
          skillBonus = overrideBonus;
      } else if (selectedSkillName) {
          const skill = data.skills.find(s => s.name === selectedSkillName);
          if (skill) {
              skillBonus = skill.value + (skill.bonus || 0);
              label = `Teste de ${skill.name}`;
          }
      }

      const rolls = [];
      let sum = 0;
      
      for(let i=0; i<qty; i++) {
          const val = Math.floor(Math.random() * sides) + 1;
          rolls.push(val);
          sum += val;
      }

      // Calculation Logic based on Mode
      let rawResult = 0;
      let currentMode: 'highest' | 'sum' = rollMode;

      // Force Sum mode if using weapon roller (usually sum for damage)
      if (overrideLabel && overrideLabel.includes('Ataque')) {
          currentMode = 'sum';
      }

      if (currentMode === 'highest') {
          rawResult = Math.max(...rolls);
      } else {
          rawResult = sum;
      }

      const totalBonus = skillBonus + extraRollBonus;
      const finalTotal = rawResult + totalBonus;

      const result: RollResult = {
          id: Date.now(),
          label: label,
          dice: `${qty}d${sides}`,
          rolls: rolls,
          skillBonus: skillBonus,
          extraBonus: extraRollBonus,
          mode: currentMode,
          total: finalTotal
      };

      setRollHistory(prev => [result, ...prev].slice(0, 5));
      // Reset extra bonus after roll? No, keep it for convenience
      return result;
  };

  // Calculator Logic
  const handleCalcInput = (val: string) => {
      setCalcDisplay(prev => prev + val);
  };
  const handleCalcClear = () => setCalcDisplay('');
  const handleCalcDelete = () => setCalcDisplay(prev => prev.slice(0, -1));
  const handleCalcResult = () => {
      try {
          // eslint-disable-next-line no-eval
          const res = eval(calcDisplay);
          setCalcDisplay(String(res));
      } catch (e) {
          setCalcDisplay('Erro');
          setTimeout(() => setCalcDisplay(''), 1000);
      }
  };

  // Combat Initiative Logic
  const submitInitiative = async (rollValue: number, isAuto: boolean) => {
      const initSkill = data.skills.find(s => s.name === 'Iniciativa');
      const bonus = (initSkill?.value || 0) + (initSkill?.bonus || 0);
      const total = rollValue + bonus;

      const camp = await dbService.getCampaignById(data.campaignId);
      if (!camp) return;

      const currentList = camp.combatInitiatives || [];
      const filteredList = currentList.filter(e => e.characterId !== data.id);
      const newEntry: CombatEntry = {
          characterId: data.id,
          name: data.name,
          initiative: total,
          originalRoll: rollValue,
          bonus: bonus,
          type: 'PLAYER'
      };

      const newList = [...filteredList, newEntry].sort((a,b) => b.initiative - a.initiative);
      await dbService.updateCampaign({ ...camp, combatInitiatives: newList });
      setManualInitInput('');
  };

  const handleAutoInitRoll = () => {
      const agi = data.attributes.AGI;
      const diceToRoll = agi <= 0 ? 2 : agi;
      const rolls = [];
      for(let i=0; i<diceToRoll; i++) rolls.push(Math.floor(Math.random() * 20) + 1);
      const result = agi <= 0 ? Math.min(...rolls) : Math.max(...rolls);
      submitInitiative(result, true);
  };

  const handleManualInitSubmit = () => {
      const val = parseInt(manualInitInput);
      if (!isNaN(val)) submitInitiative(val, false);
  };

  // Persist
  const handleSave = async () => {
    setIsSaving(true);
    await dbService.updateCharacter(data);
    onUpdate(data);
    setIsDirty(false);
    setIsSaving(false);
  };

  // --- EXIT LOGIC ---
  const handleBackClick = () => {
    if (isDirty) {
      setShowExitModal(true);
    } else {
      onBack();
    }
  };

  const handleExitConfirm = async () => {
    await handleSave();
    setShowExitModal(false);
    onBack();
  };

  const handleExitDiscard = () => {
    setShowExitModal(false);
    onBack();
  };

  const handleDelete = async () => {
    if (deleteStep === 0) setDeleteStep(1);
    else if (deleteStep === 1) {
        await dbService.deleteCharacter(data.id);
        onDeleteCampaignData();
        onDelete();
    }
  };

  // Helper to remove self from archives if character deleted (optional cleanup)
  const onDeleteCampaignData = async () => {
      const archives = await dbService.getCampaignArchives(data.campaignId);
      const updatedArchives = archives.map(a => ({
          ...a,
          holders: a.holders.filter(h => h !== data.id),
          sharedWith: a.sharedWith.filter(s => s !== data.id)
      }));
      await dbService.updateCampaignArchives(data.campaignId, updatedArchives);
  }

  // --- CALCULATIONS ---
  const hasMilitaryBackpack = data.inventory.some(i => i.category === 'MOCHILA MILITAR');
  // Load = FOR * 5. If FOR is 0, technically load is 0, but usually we fallback to 2 or maintain logic.
  // Using explicit logic as requested: Força * 5. But wait, new logic: 0 FOR = 2 base.
  const strength = data.attributes.FOR || 0;
  const baseLoad = strength === 0 ? 2 : strength * 5;
  const maxLoad = baseLoad + (hasMilitaryBackpack ? 2 : 0) + (data.loadBonus || 0);

  const totalLoad = data.inventory.reduce((acc, item) => acc + (item.weight * item.quantity), 0);

  const baseDefense = 10;
  const agiDefense = data.attributes.AGI;
  const shieldDefense = data.inventory
    .filter(i => i.category === 'ESCUDO')
    .reduce((acc, i) => acc + (Number(i.defense) || 0), 0);
  const otherDefense = data.defenseBonus || 0;
  const totalDefense = baseDefense + agiDefense + shieldDefense + otherDefense;

  const myMissionFiles = campaignArchives.filter(a => a.holders.includes(data.id));
  
  // New State Logic:
  const [allSharedDocs, setAllSharedDocs] = useState<SharedDocument[]>([]);
  
  useEffect(() => {
      const fetchShared = async () => {
          const docs = await dbService.getSharedDocuments(data.campaignId);
          // Filter for ME
          const relevant = docs.filter(d => d.isPublic || (d.sharedWith && d.sharedWith.length > 0 && d.sharedWith.includes(data.id)));
          setAllSharedDocs(relevant);
      };
      fetchShared();
      // Polling or Subscription would be better, but simple fetch on mount/update works for now
  }, [data.campaignId, data.id, activeTab]); // Refresh when tab changes

  // Combine Campaign Archives Shared + Personal Docs Shared
  // Campaign Archives that are shared with me:
  const campaignShared = campaignArchives.filter(a => a.sharedWith.includes(data.id) && !a.holders.includes(data.id));
  
  const currentClassColor = CLASS_COLORS[data.class] || 'text-ordem-green border-ordem-green';

  // Determine System Type - UPDATED: Read from mapConfig
  const systemType = campaignFullData?.mapConfig?.system || 'DETERMINATION';

  return (
    <div className="max-w-7xl mx-auto pb-20">
      
      {/* System Status Indicators */}
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
           <div className="flex items-center gap-2 px-3 py-1 bg-black/80 border border-ordem-border rounded-full shadow-lg backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ordem-green opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-ordem-green"></span>
                </span>
                <span className="text-[10px] font-mono font-bold text-ordem-green tracking-widest">SISTEMA ONLINE</span>
           </div>
           {isDirty && (
               <div className="flex items-center gap-2 px-3 py-1 bg-yellow-900/80 border border-yellow-600 rounded-full shadow-lg backdrop-blur-md animate-pulse">
                    <span className="text-[10px] font-mono font-bold text-yellow-500 tracking-widest uppercase">
                        Alterações Pendentes
                    </span>
               </div>
           )}
      </div>
      
      {/* ... MODALS (Combat, Pwd, Exit, Sharing, Fullscreen, Training) ... */}
      
      {/* COMBAT MODAL */}
      {showCombatModal && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300">
             <div className="bg-ordem-panel border border-ordem-blood p-8 max-w-lg w-full relative shadow-[0_0_50px_rgba(183,0,44,0.3)]">
                 <button onClick={() => setShowCombatModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X/></button>
                 <h3 className="text-2xl font-title font-black text-ordem-blood mb-6 flex items-center gap-2 border-b border-ordem-blood/30 pb-4">
                     <Sword className="w-8 h-8" /> MODO DE COMBATE
                 </h3>
                 <div className="grid grid-cols-2 gap-6 mb-8">
                     <button onClick={handleAutoInitRoll} className="bg-black/40 border border-zinc-700 hover:border-ordem-blood hover:bg-ordem-blood/10 p-4 text-center group transition-all">
                         <Dices className="w-8 h-8 text-zinc-500 group-hover:text-ordem-blood mx-auto mb-2 transition-colors" />
                         <span className="block text-sm font-bold text-white uppercase mb-1">Rolagem Automática</span>
                         <span className="block text-[10px] text-zinc-500 font-mono">
                             {data.attributes.AGI <= 0 ? '2d20 (Menor)' : `${data.attributes.AGI}d20 (Maior)`} + {data.skills.find(s => s.name === 'Iniciativa')?.value || 0}
                         </span>
                     </button>
                     <div className="bg-black/40 border border-zinc-700 p-4 text-center">
                         <span className="block text-sm font-bold text-white uppercase mb-2">Inserir Dado Físico</span>
                         <div className="flex gap-2">
                             <input type="number" value={manualInitInput} onChange={e => setManualInitInput(e.target.value)} className="w-full bg-black border border-zinc-600 text-white font-mono text-center outline-none focus:border-ordem-blood" placeholder="d20" />
                             <Button onClick={handleManualInitSubmit} variant="danger" className="px-3">OK</Button>
                         </div>
                     </div>
                 </div>
                 <div className="bg-black/50 border border-zinc-800">
                     <div className="bg-ordem-blood/20 p-2 text-xs font-bold text-ordem-blood uppercase border-b border-ordem-blood/30">Ordem do Turno</div>
                     <div className="max-h-[200px] overflow-y-auto">
                         <table className="w-full text-left text-xs font-mono">
                             <tbody className="divide-y divide-zinc-800">
                                 {combatInitiatives.map((entry, idx) => (
                                     <tr key={idx} className={entry.characterId === data.id ? 'bg-ordem-blood/10' : ''}>
                                         <td className="p-2 text-zinc-500 w-8">#{idx + 1}</td>
                                         <td className={`p-2 font-bold flex items-center gap-2 ${entry.characterId === data.id ? 'text-ordem-blood' : 'text-zinc-300'}`}>
                                             {entry.type === 'MONSTER' && <Skull className="w-3 h-3 text-ordem-blood"/>}
                                             {entry.name}
                                         </td>
                                         <td className="p-2 text-right text-white font-bold">{entry.type === 'MONSTER' ? <span className="text-zinc-500 font-mono tracking-widest">???</span> : entry.initiative}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 </div>
             </div>
          </div>
      )}

      {/* Sharing Modal */}
      {sharingArchive && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300">
             <div className="bg-ordem-panel border border-ordem-purple p-6 max-w-lg w-full relative shadow-[0_0_30px_rgba(124,58,237,0.3)] flex flex-col max-h-[90vh]">
                 <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                    <h3 className="text-lg font-title font-bold text-white flex items-center gap-2"><Share2 className="text-ordem-purple w-5 h-5" /> Gerenciar Acesso</h3>
                    <button onClick={() => setSharingArchive(null)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6"/></button>
                 </div>
                 <div className="bg-black/50 p-4 mb-6 border border-zinc-800"><span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Arquivo Selecionado</span><p className="text-white font-title text-xl">{sharingArchive.name}</p></div>
                 <div className="flex-grow overflow-y-auto mb-6 custom-scrollbar pr-2">
                     <div className="space-y-4">
                         <div className="flex items-center justify-between p-3 border border-zinc-700 bg-black/20 hover:border-ordem-purple transition-colors">
                             <div className="flex items-center gap-3"><Globe className={`w-5 h-5 ${sharingArchive.isPublic ? 'text-ordem-purple' : 'text-zinc-500'}`} /><div><p className="text-sm font-bold text-white uppercase">Acesso Público</p><p className="text-[10px] text-zinc-500 uppercase">Disponível na aba "Evidências" para todos.</p></div></div>
                             <input type="checkbox" checked={sharingArchive.isPublic} onChange={() => handleShareChange('PUBLIC', true)} className="w-5 h-5 accent-ordem-purple"/>
                         </div>
                         <div className="border-t border-zinc-800 my-4"></div>
                         <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">Compartilhar com Agentes Específicos:</p>
                         {campaignAgents.filter(agent => !agent.hidden).map(agent => (
                             <label key={agent.id} className="flex items-center justify-between p-2 hover:bg-white/5 cursor-pointer rounded">
                                 <div className="flex items-center gap-3"><User className="w-4 h-4 text-zinc-500" /><span className="text-sm text-zinc-300 font-mono uppercase">{agent.name}</span></div>
                                 <input type="checkbox" checked={sharingArchive.sharedWith?.includes(agent.id)} onChange={() => handleShareChange(agent.id, false)} className="w-4 h-4 accent-ordem-purple"/>
                             </label>
                         ))}
                     </div>
                 </div>
                 <Button onClick={() => setSharingArchive(null)} variant="primary" className="w-full">Concluir</Button>
             </div>
          </div>
      )}
      
      {showExitModal && <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300"><div className="bg-ordem-panel border border-ordem-blood p-8 max-w-md w-full relative shadow-[0_0_30px_rgba(183,0,44,0.3)]"><h3 className="text-xl font-title font-bold text-white mb-4 flex items-center gap-2"><AlertTriangle className="text-ordem-blood" />ALTERAÇÕES NÃO SALVAS</h3><p className="text-zinc-300 font-mono mb-8 leading-relaxed">Existem dados pendentes neste dossiê. Sair sem salvar resultará na perda permanente das informações registradas.</p><div className="flex flex-col gap-3"><Button onClick={handleExitConfirm} variant="primary" isLoading={isSaving} className="w-full">SALVAR E SAIR</Button><Button onClick={handleExitDiscard} variant="danger" className="w-full">SAIR SEM SALVAR</Button><Button onClick={() => setShowExitModal(false)} variant="ghost" className="w-full">CANCELAR</Button></div></div></div>}
      {viewingDoc && <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300"><button onClick={() => setViewingDoc(null)} className="absolute top-6 right-6 text-white hover:text-ordem-blood transition-colors"><X className="w-10 h-10" /></button><div className="max-w-[90vw] max-h-[90vh] relative"><img src={viewingDoc} alt="Document Fullscreen" className="max-w-full max-h-[90vh] object-contain border-2 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,1)]" /></div></div>}
      {showTrainingModal && <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300"><div className="bg-ordem-panel border border-ordem-purple p-8 max-w-md w-full relative shadow-[0_0_30px_rgba(124,58,237,0.3)]"><h3 className="text-xl font-title font-bold text-white mb-4 flex items-center gap-2"><AlertCircle className="text-ordem-purple" />Perícia Restrita</h3><p className="text-zinc-300 font-mono mb-6 leading-relaxed">Esta perícia exige <strong>Treinamento (Nível 5 ou superior)</strong> para ser utilizada.<br/><br/>Agentes não treinados não podem realizar testes com esta perícia, exceto em circunstâncias muito específicas determinadas pelo Mestre.</p><Button onClick={() => setShowTrainingModal(false)} variant="primary" className="w-full">Entendido</Button></div></div>}

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 border-b-2 border-ordem-border pb-6 relative">
        <div className="absolute top-0 left-0 w-32 h-1 bg-ordem-purple"></div>
        <div className="flex items-center gap-6 w-full">
          <Button variant="ghost" onClick={handleBackClick} className="p-3 border border-zinc-800 hover:border-white rounded-none flex-shrink-0"><ArrowLeft /></Button>
          <div className="flex items-center gap-6 w-full">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-black border border-zinc-800 flex-shrink-0 relative overflow-hidden group">
                {data.imageUrl ? <img src={data.imageUrl} className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500" alt="Avatar" /> : <div className="w-full h-full flex items-center justify-center bg-black/50"><User className="w-10 h-10 text-zinc-700" /></div>}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-ordem-purple"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-ordem-purple"></div>
            </div>
            <div className="flex-grow">
                <div className="flex items-center gap-3 mb-1"><span className="bg-ordem-blood text-white text-[10px] font-bold px-2 py-0.5 tracking-widest uppercase">Classificado</span><span className="text-zinc-500 font-mono text-xs uppercase tracking-widest hidden md:inline">Ultima atualização: {new Date(data.updatedAt).toLocaleDateString()}</span></div>
                <h1 className="text-3xl md:text-5xl font-title font-black text-white uppercase tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] line-clamp-1">{data.name}</h1>
                <div className="flex flex-wrap gap-4 text-sm font-tech uppercase tracking-[0.2em] mt-2"><span className={`border px-2 py-1 ${currentClassColor}`}>{data.class}</span>{data.trail && <span className={`border px-2 py-1 ${currentClassColor}`}>{data.trail}</span>}<span className="border border-ordem-green/30 px-2 py-1 text-ordem-green">NEX {data.nex}%</span><span className="border border-ordem-green/30 px-2 py-1 text-ordem-green">{data.origin}</span></div>
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-center flex-shrink-0 mt-4 md:mt-0 ml-auto md:ml-0">
          {isCombatActive && <Button variant="danger" onClick={() => setShowCombatModal(true)} className="animate-pulse shadow-[0_0_15px_rgba(183,0,44,0.6)] font-black text-lg">COMBATE</Button>}
          {deleteStep > 0 && <div className="flex items-center gap-2 bg-ordem-blood/10 p-2 border border-ordem-blood animate-pulse"><button className="text-ordem-blood font-bold text-xs hover:text-white uppercase" onClick={handleDelete}>{deleteStep === 1 ? 'Confirmar Exclusão' : '...'}</button><button className="text-zinc-500 text-xs uppercase hover:text-white" onClick={() => setDeleteStep(0)}>Cancelar</button></div>}
          {deleteStep === 0 && <Button variant="danger" onClick={() => setDeleteStep(1)} title="Arquivar Agente"><Trash2 className="w-5 h-5" /></Button>}
          <Button variant="primary" onClick={handleSave} disabled={!isDirty} isLoading={isSaving} className="flex gap-2 items-center"><Save className="w-4 h-4" /><span className="hidden md:inline">Salvar Alterações</span></Button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="flex gap-1 mb-8 border-b border-ordem-border/50 overflow-x-auto">
        {TABS.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-6 py-3 font-title text-sm uppercase font-bold tracking-widest transition-all clip-path-slant-top whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-black border-t-2 border-ordem-purple relative top-[1px]' : 'bg-transparent text-zinc-500 hover:text-white hover:bg-white/5'}`}><tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-ordem-purple' : ''}`} />{tab.label}</button>))}
      </nav>

      {/* Content Area */}
      <main className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[500px]">
        
        {/* === MAIN TAB === */}
        {activeTab === 'main' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left Column: Attributes & Vitals */}
            <div className="md:col-span-4 space-y-8">
              {/* Vitals Blocks */}
              <div className="grid grid-cols-1 gap-4">
                  {/* PV (Always Visible) */}
                  <div className="bg-black/40 border-l-4 border-ordem-blood p-4 relative overflow-hidden group">
                      <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity"><Heart className="w-24 h-24 text-ordem-blood -rotate-12 translate-x-8 -translate-y-8" /></div>
                      <label className="text-ordem-blood font-black text-xs uppercase tracking-widest mb-2 block">Pontos de Vida</label>
                      <div className="flex items-end gap-2 relative z-10">
                          <input type="number" className="bg-transparent text-4xl font-title font-bold text-white w-20 outline-none border-b border-white/20 focus:border-ordem-blood" value={data.pv.current} onChange={(e) => handleNestedChange('pv', 'current', parseInt(e.target.value) || 0)} />
                          <span className="text-zinc-600 text-xl font-light">/</span>
                          <input type="number" className="bg-transparent text-xl font-mono text-zinc-500 w-16 outline-none" value={data.pv.max} onChange={(e) => handleNestedChange('pv', 'max', parseInt(e.target.value) || 0)} />
                      </div>
                  </div>

                  {/* CONDITIONAL SYSTEM BLOCK */}
                  {systemType === 'SANITY_EFFORT' ? (
                     <>
                        {/* PONTOS DE ESFORÇO (PE) */}
                        <div className="bg-black/40 border-l-4 border-yellow-500 p-4 relative overflow-hidden group">
                            <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity"><Zap className="w-24 h-24 text-yellow-500 -rotate-12 translate-x-8 -translate-y-8" /></div>
                            <label className="text-yellow-500 font-black text-xs uppercase tracking-widest mb-2 block">Pontos de Esforço</label>
                            <div className="flex items-end gap-2 relative z-10">
                                <input type="number" className="bg-transparent text-4xl font-title font-bold text-white w-20 outline-none border-b border-white/20 focus:border-yellow-500" value={data.pe.current} onChange={(e) => handleNestedChange('pe', 'current', parseInt(e.target.value) || 0)} />
                                <span className="text-zinc-600 text-xl font-light">/</span>
                                <input type="number" className="bg-transparent text-xl font-mono text-zinc-500 w-16 outline-none" value={data.pe.max} onChange={(e) => handleNestedChange('pe', 'max', parseInt(e.target.value) || 0)} />
                            </div>
                        </div>

                        {/* SANIDADE (SAN) */}
                        <div className="bg-black/40 border-l-4 border-blue-600 p-4 relative overflow-hidden group">
                            <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity"><Brain className="w-24 h-24 text-blue-600 -rotate-12 translate-x-8 -translate-y-8" /></div>
                            <label className="text-blue-500 font-black text-xs uppercase tracking-widest mb-2 block">Sanidade</label>
                            <div className="flex items-end gap-2 relative z-10">
                                <input type="number" className="bg-transparent text-4xl font-title font-bold text-white w-20 outline-none border-b border-white/20 focus:border-blue-600" value={data.san.current} onChange={(e) => handleNestedChange('san', 'current', parseInt(e.target.value) || 0)} />
                                <span className="text-zinc-600 text-xl font-light">/</span>
                                <input type="number" className="bg-transparent text-xl font-mono text-zinc-500 w-16 outline-none" value={data.san.max} onChange={(e) => handleNestedChange('san', 'max', parseInt(e.target.value) || 0)} />
                            </div>
                        </div>
                     </>
                  ) : (
                     /* PONTOS DE DETERMINAÇÃO (Fallback/Default) - Maps to SAN fields internally for compatibility */
                     <div className="bg-black/40 border-l-4 border-blue-600 p-4 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity"><Star className="w-24 h-24 text-blue-600 -rotate-12 translate-x-8 -translate-y-8" /></div>
                        <label className="text-blue-500 font-black text-xs uppercase tracking-widest mb-2 block">Pontos de Determinação</label>
                        <div className="flex items-end gap-2 relative z-10">
                            <input type="number" className="bg-transparent text-4xl font-title font-bold text-white w-20 outline-none border-b border-white/20 focus:border-blue-600" value={data.san.current} onChange={(e) => handleNestedChange('san', 'current', parseInt(e.target.value) || 0)} />
                            <span className="text-zinc-600 text-xl font-light">/</span>
                            <input type="number" className="bg-transparent text-xl font-mono text-zinc-500 w-16 outline-none" value={data.san.max} onChange={(e) => handleNestedChange('san', 'max', parseInt(e.target.value) || 0)} />
                        </div>
                    </div>
                  )}

                  {/* DEFESA */}
                  <div className="bg-black/40 border-l-4 border-zinc-500 p-4 relative overflow-hidden group">
                      <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity"><Shield className="w-24 h-24 text-zinc-500 -rotate-12 translate-x-8 -translate-y-8" /></div>
                      <label className="text-zinc-400 font-black text-xs uppercase tracking-widest mb-2 block">Defesa</label>
                      <div className="flex items-end gap-2 relative z-10">
                          <div className="text-4xl font-title font-bold text-white w-24 border-b border-white/20 focus:border-zinc-500">{totalDefense}</div>
                          <div className="flex gap-4 ml-4">
                             <div className="flex flex-col"><span className="text-[8px] text-zinc-500 uppercase tracking-widest">Base</span><span className="text-zinc-300 font-mono">10</span></div>
                             <div className="flex flex-col"><span className="text-[8px] text-ordem-green uppercase tracking-widest">AGI</span><span className="text-ordem-green font-mono">+{agiDefense}</span></div>
                             <div className="flex flex-col"><span className="text-[8px] text-zinc-500 uppercase tracking-widest">Escudos</span><span className="text-zinc-300 font-mono">+{shieldDefense}</span></div>
                             <div className="flex flex-col w-12"><span className="text-[8px] text-ordem-purple uppercase tracking-widest">Outros</span><input type="number" className="bg-transparent border-b border-zinc-700 text-ordem-purple font-bold outline-none text-center" value={data.defenseBonus || 0} onChange={(e) => handleChange('defenseBonus', parseInt(e.target.value) || 0)} /></div>
                          </div>
                      </div>
                  </div>
              </div>
              {/* Attributes Pentagram */}
              <div className="bg-ordem-panel border border-ordem-border p-6 relative">
                 <h3 className="text-ordem-purple font-title font-bold uppercase tracking-widest mb-6 text-center border-b border-ordem-border/50 pb-2">Atributos</h3>
                 <div className="grid grid-cols-2 gap-4 relative z-10">
                    {(Object.keys(data.attributes) as AttributeName[]).map(attr => (
                      <div key={attr} className="flex flex-col items-center justify-center p-2 bg-black/50 border border-zinc-800 hover:border-ordem-green transition-colors group">
                        <span className="text-3xl font-title font-black text-white group-hover:text-ordem-green transition-colors">{data.attributes[attr]}</span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">{attr}</span>
                        <div className="flex gap-2 mt-2 opacity-20 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleAttributeChange(attr, Math.max(0, data.attributes[attr] - 1))} className="text-zinc-500 hover:text-white w-6 h-6 bg-white/5 flex items-center justify-center hover:bg-white/10">-</button>
                            <button onClick={() => handleAttributeChange(attr, Math.min(10, data.attributes[attr] + 1))} className="text-zinc-500 hover:text-white w-6 h-6 bg-white/5 flex items-center justify-center hover:bg-white/10">+</button>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
               {/* CALCULATOR */}
               <div className="bg-ordem-panel border border-ordem-border p-4 relative overflow-hidden">
                  <h3 className="text-white font-title font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-xs"><CalcIcon className="w-4 h-4 text-zinc-500" /> Calculadora Tática</h3>
                  <div className="bg-black border border-zinc-800 p-2 mb-2 text-right font-mono text-xl text-ordem-green h-10 overflow-hidden">{calcDisplay || '0'}</div>
                  <div className="grid grid-cols-4 gap-1">
                      {['7','8','9','/'].map(k => (<button key={k} type="button" onClick={() => handleCalcInput(k)} className={`p-2 font-mono font-bold text-sm bg-black/40 hover:bg-white/10 ${['/','*','-','+'].includes(k) ? 'text-ordem-purple' : 'text-zinc-400'}`}>{k}</button>))}
                      {['4','5','6','*'].map(k => (<button key={k} type="button" onClick={() => handleCalcInput(k)} className={`p-2 font-mono font-bold text-sm bg-black/40 hover:bg-white/10 ${['/','*','-','+'].includes(k) ? 'text-ordem-purple' : 'text-zinc-400'}`}>{k}</button>))}
                      {['1','2','3','-'].map(k => (<button key={k} type="button" onClick={() => handleCalcInput(k)} className={`p-2 font-mono font-bold text-sm bg-black/40 hover:bg-white/10 ${['/','*','-','+'].includes(k) ? 'text-ordem-purple' : 'text-zinc-400'}`}>{k}</button>))}
                      <button type="button" onClick={handleCalcClear} className="p-2 font-mono font-bold text-sm bg-black/40 hover:bg-ordem-blood/20 text-ordem-blood">C</button>
                      <button type="button" onClick={() => handleCalcInput('0')} className="p-2 font-mono font-bold text-sm bg-black/40 hover:bg-white/10 text-zinc-400">0</button>
                      <button type="button" onClick={handleCalcResult} className="p-2 font-mono font-bold text-sm bg-ordem-green/10 hover:bg-ordem-green/20 text-ordem-green">=</button>
                      <button type="button" onClick={() => handleCalcInput('+')} className="p-2 font-mono font-bold text-sm bg-black/40 hover:bg-white/10 text-ordem-purple">+</button>
                  </div>
               </div>
            </div>

            {/* Right Column: Details & History */}
            <div className="md:col-span-8 space-y-8">
               <div className="bg-ordem-panel p-8 border border-ordem-border relative overflow-hidden">
                  <h3 className="text-white font-title font-bold uppercase tracking-widest mb-6 border-l-4 border-ordem-purple pl-3">Dados Pessoais</h3>
                  <div className="grid grid-cols-2 gap-8 mb-6">
                      <Input label="Nome Completo" value={data.name || ''} onChange={e => handleChange('name', e.target.value)} />
                      <Input label="Jogador" value={data.player || ''} onChange={e => handleChange('player', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                      <Input label="Origem" value={data.origin || ''} onChange={e => handleChange('origin', e.target.value)} />
                      <div className="flex flex-col gap-1 w-full group"><label className="text-[10px] uppercase tracking-[0.2em] text-ordem-muted font-bold group-focus-within:text-ordem-purple transition-colors font-tech">Classe</label><select className={`bg-black/40 border-b border-ordem-border rounded-t px-3 py-2 text-ordem-text font-tech text-lg focus:border-ordem-purple focus:ring-0 focus:bg-ordem-purple/5 focus:shadow-[0_4px_10px_-5px_rgba(124,58,237,0.3)] outline-none transition-all appearance-none cursor-pointer ${CLASS_COLORS[data.class] || ''}`} value={data.class || ''} onChange={e => handleChange('class', e.target.value)}><option value="" className="text-zinc-500 bg-black">SELECIONE A CLASSE...</option>{CHARACTER_CLASSES.map(cls => (<option key={cls} value={cls} className={`bg-black font-bold ${CLASS_COLORS[cls]}`}>{cls}</option>))}</select></div>
                      <Input label="Trilha" value={data.trail || ''} onChange={e => handleChange('trail', e.target.value)} placeholder="Ex: Aniquilador" />
                      <Input label="Patente" value={data.patent || ''} onChange={e => handleChange('patent', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-3 gap-6 mb-6">
                      <div className="flex flex-col gap-1 w-full group"><label className="text-[10px] uppercase tracking-[0.2em] text-ordem-muted font-bold group-focus-within:text-ordem-purple transition-colors font-tech">NEX</label><div className="flex items-center justify-between bg-black/40 border-b border-ordem-border rounded-t px-1 py-1 text-ordem-text font-tech text-lg transition-all focus-within:border-ordem-purple focus-within:bg-ordem-purple/5 focus-within:shadow-[0_4px_10px_-5px_rgba(124,58,237,0.3)] h-12"><button onClick={() => handleChange('nex', Math.max(0, (data.nex || 0) - 5))} className="text-zinc-500 hover:text-white hover:bg-white/10 transition-colors w-16 h-full flex items-center justify-center font-bold text-2xl border-r border-zinc-800">-</button><span className="text-center font-bold text-white w-full">{data.nex || 0}%</span><button onClick={() => handleChange('nex', Math.min(99, (data.nex || 0) + 5))} className="text-zinc-500 hover:text-white hover:bg-white/10 transition-colors w-16 h-full flex items-center justify-center font-bold text-2xl border-l border-zinc-800">+</button></div></div>
                      <Input type="number" label="Idade" value={data.age} onChange={e => handleChange('age', parseInt(e.target.value))} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <Input label="URL da Foto/Avatar" value={data.imageUrl || ''} onChange={e => handleChange('imageUrl', e.target.value)} placeholder="https://..." />
                    <Input label="URL do Token Principal (Mapa)" value={data.tokenUrl || ''} onChange={e => handleChange('tokenUrl', e.target.value)} placeholder="https://..." />
                  </div>

                  {/* Token Variants */}
                  <div className="bg-black/30 border border-zinc-800 p-4">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Variantes do Token (Mapa)</span>
                      <div className="grid grid-cols-2 gap-6">
                          <Input label="URL Variante (2)" value={data.tokenUrl2 || ''} onChange={e => handleChange('tokenUrl2', e.target.value)} placeholder="Opcional" />
                          <Input label="URL Caído/Morto (3)" value={data.tokenUrl3 || ''} onChange={e => handleChange('tokenUrl3', e.target.value)} placeholder="Opcional" />
                      </div>
                  </div>
               </div>

               {/* Dice Roller */}
               <div className="bg-ordem-panel p-6 border border-ordem-border relative overflow-hidden">
                  <h3 className="text-white font-title font-bold uppercase tracking-widest mb-4 border-l-4 border-ordem-blood pl-3 flex items-center gap-2"><Dices className="w-5 h-5 text-ordem-blood" /> Rolagem de Dados</h3>
                  <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                          {/* Row 1: Quantity & Skill */}
                          <div className="flex items-center gap-4">
                              <div className="flex flex-col gap-1"><label className="text-zinc-500 font-mono uppercase text-xs">Quantidade</label><Input type="number" value={diceQty} onChange={e => setDiceQty(parseInt(e.target.value) || 1)} className="w-20 text-center font-bold text-white border-zinc-700"/></div>
                              <div className="flex flex-col gap-1 flex-grow"><label className="text-zinc-500 font-mono uppercase text-xs">Perícia (Bônus)</label><select className="w-full bg-black border-b border-zinc-700 text-ordem-text font-tech text-lg h-[46px] outline-none focus:border-ordem-purple" value={selectedSkillName} onChange={(e) => setSelectedSkillName(e.target.value)}><option value="">Sem Bônus</option>{data.skills.sort((a,b) => a.name.localeCompare(b.name)).map(s => (<option key={s.name} value={s.name}>{s.name} (+{s.value + (s.bonus || 0)})</option>))}</select></div>
                          </div>
                          
                          {/* Row 2: Mode & Extra Bonus */}
                          <div className="flex items-end gap-4">
                              <div className="flex flex-col gap-1">
                                  <label className="text-zinc-500 font-mono uppercase text-xs">Modo de Rolagem</label>
                                  <div className="flex border border-zinc-700 bg-black h-[46px]">
                                      <button onClick={() => setRollMode('highest')} className={`px-3 font-bold text-xs uppercase transition-colors ${rollMode === 'highest' ? 'bg-ordem-purple text-white' : 'text-zinc-500 hover:text-white'}`}>Maior</button>
                                      <button onClick={() => setRollMode('sum')} className={`px-3 font-bold text-xs uppercase transition-colors ${rollMode === 'sum' ? 'bg-ordem-green text-black' : 'text-zinc-500 hover:text-white'}`}>Soma</button>
                                  </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                  <label className="text-zinc-500 font-mono uppercase text-xs">Bônus Extra</label>
                                  <Input type="number" value={extraRollBonus} onChange={e => setExtraRollBonus(parseInt(e.target.value) || 0)} className="w-24 text-center border-zinc-700"/>
                              </div>
                          </div>

                          {/* Row 3: Dice Buttons */}
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">{[4,6,8,10,12,20].map(d => (<button key={d} onClick={() => rollDice(d)} className="bg-black border border-zinc-700 hover:border-ordem-blood hover:bg-ordem-blood/10 text-zinc-300 hover:text-white font-mono font-bold py-2 transition-all">d{d}</button>))}</div>
                      </div>
                      
                      {/* History Panel */}
                      <div className="flex-1 bg-black/40 border border-zinc-800 p-4 min-h-[120px] flex flex-col">{rollHistory.length > 0 ? (<><div className="mb-4"><span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">{rollHistory[0].label} <span className="text-ordem-purple ml-2">[{rollHistory[0].mode === 'highest' ? 'MAIOR' : 'SOMA'}]</span></span><div className="flex items-end gap-2 flex-wrap"><span className="text-3xl text-ordem-green font-title font-black drop-shadow-[0_0_5px_rgba(0,255,157,0.5)]">{rollHistory[0].total}</span><span className="text-zinc-500 font-mono text-xs mb-1">[{rollHistory[0].rolls.join(', ')}] {rollHistory[0].skillBonus > 0 ? ` + ${rollHistory[0].skillBonus} (Perícia)` : ''} {rollHistory[0].extraBonus !== 0 ? ` ${rollHistory[0].extraBonus >= 0 ? '+' : ''}${rollHistory[0].extraBonus} (Extra)` : ''}</span></div></div><div className="mt-auto pt-2 border-t border-zinc-800"><span className="text-[8px] text-zinc-600 uppercase tracking-widest block mb-1">Histórico Recente</span><div className="space-y-1">{rollHistory.slice(1).map(r => (<div key={r.id} className="flex justify-between text-xs font-mono text-zinc-500"><span>{r.label} ({r.dice}) [{r.mode === 'highest' ? 'Max' : 'Sum'}]</span><span className="text-zinc-300 font-bold">{r.total}</span></div>))}</div></div></>) : (<div className="flex items-center justify-center h-full text-zinc-600 font-mono text-xs uppercase tracking-widest">Aguardando input...</div>)}</div>
                  </div>
               </div>
               
               <div className="bg-ordem-panel p-8 border border-ordem-border flex flex-col min-h-[400px]">
                  <h3 className="text-white font-title font-bold uppercase tracking-widest mb-4 border-l-4 border-ordem-green pl-3">Histórico & Anotações</h3>
                  <textarea
                      ref={historyRef}
                      value={data.history || ''}
                      onChange={(e) => {
                          handleChange('history', e.target.value);
                          // Auto resize logic
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      className="w-full flex-grow bg-black/20 text-zinc-300 font-mono text-sm leading-relaxed resize-none border-0 focus:ring-0 outline-none p-4 placeholder:text-zinc-700"
                      placeholder="Registro de ocorrências, traumas e antecedentes..."
                  />
               </div>
            </div>
          </div>
        )}

        {/* ... Rest of tabs (Rituals, Powers, Documents) omitted for brevity as they are unchanged ... */}
        {/* === MAP TAB === */}
        {activeTab === 'map' && campaignFullData && (
            <div className="bg-ordem-panel border border-ordem-border p-2">
                 <MapView 
                     campaign={campaignFullData} 
                     characters={campaignAgents} 
                     isAdmin={false} // Character sheet view is rarely admin, usually player
                     currentIdentity={data.id}
                 />
            </div>
        )}

        {/* === SKILLS TAB === */}
        {activeTab === 'skills' && (
             <div className="bg-ordem-panel p-8 border border-ordem-border">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                   {ATTRIBUTE_GROUPS.map(attr => (
                       <div key={attr} className="space-y-4">
                           <h4 className={`text-xl font-title font-black border-b pb-2 ${ATTRIBUTE_LABELS[attr].color} ${ATTRIBUTE_LABELS[attr].border}`}>
                               {ATTRIBUTE_LABELS[attr].label}
                           </h4>
                           <div className="space-y-4">
                               {data.skills
                                 .filter(s => s.attribute === attr)
                                 .sort((a,b) => a.name.localeCompare(b.name))
                                 .map(skill => (
                                   <div key={skill.name} className="bg-black/40 p-3 border-l-2 border-zinc-700 hover:border-ordem-purple transition-all group">
                                      <div className="flex justify-between items-center mb-2">
                                         <div className="flex items-center gap-1">
                                             <label className="text-zinc-300 font-bold uppercase text-sm tracking-wide">{skill.name}</label>
                                             {TRAINING_REQUIRED_SKILLS.includes(skill.name) && (
                                                <button onClick={() => setShowTrainingModal(true)} className="text-zinc-600 hover:text-ordem-purple cursor-pointer">
                                                    <HelpCircle className="w-3 h-3" />
                                                </button>
                                             )}
                                         </div>
                                         <span className="text-2xl font-title font-bold text-white">
                                             {skill.value + (skill.bonus || 0)}
                                         </span>
                                      </div>
                                      
                                      {/* Controls */}
                                      <div className="flex gap-2 items-center justify-between">
                                         <div className="flex gap-1">
                                            {[0, 5, 10, 15].map(val => (
                                              <button
                                                key={val}
                                                onClick={() => handleSkillChange(skill.name, val)}
                                                className={`w-6 h-6 text-[10px] font-bold border ${skill.value >= val && val > 0 ? 'bg-ordem-purple border-ordem-purple text-white' : 'bg-black border-zinc-800 text-zinc-600'} hover:border-white transition-all`}
                                              >
                                                {val === 0 ? '-' : val === 5 ? 'T' : val === 10 ? 'V' : 'E'}
                                              </button>
                                            ))}
                                         </div>
                                         <div className="flex items-center gap-1">
                                            <span className="text-[8px] text-zinc-600 uppercase">Bônus</span>
                                            <input 
                                                type="number" 
                                                className="w-8 bg-black border-b border-zinc-700 text-right text-xs text-ordem-green focus:border-ordem-green outline-none"
                                                value={skill.bonus || 0}
                                                onChange={(e) => handleSkillBonusChange(skill.name, parseInt(e.target.value) || 0)}
                                            />
                                         </div>
                                      </div>

                                      {/* Special Input for Profession */}
                                      {skill.name === 'Profissão' && (
                                          <input 
                                            type="text" 
                                            className="w-full mt-2 bg-transparent border-b border-zinc-800 text-xs text-zinc-400 placeholder:text-zinc-700 focus:border-ordem-purple outline-none"
                                            placeholder="Especifique..."
                                            value={skill.other || ''}
                                            onChange={(e) => handleSkillOtherChange(skill.name, e.target.value)}
                                          />
                                      )}
                                   </div>
                               ))}
                           </div>
                       </div>
                   ))}
                </div>
             </div>
        )}

        {/* === INVENTORY TAB === */}
        {activeTab === 'inventory' && (
             <div className="space-y-6">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-ordem-panel p-4 border border-zinc-800">
                    <div>
                        <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Carga Atual</span>
                        <p className={`text-2xl font-title font-bold ${totalLoad > maxLoad ? 'text-ordem-blood' : 'text-white'}`}>
                           {totalLoad} <span className="text-zinc-600 text-sm">/ {maxLoad}</span>
                        </p>
                    </div>
                    <div>
                         <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Categoria</span>
                         <p className="text-2xl font-title font-bold text-white">{data.patent}</p>
                    </div>
                    <div>
                        <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Bônus de Carga</span>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-600 font-bold">+</span>
                            <input 
                                type="number" 
                                className="bg-transparent text-2xl font-title font-bold text-ordem-green w-16 outline-none border-b border-zinc-700 focus:border-ordem-green"
                                value={data.loadBonus || 0}
                                onChange={(e) => handleChange('loadBonus', parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                </div>

                {/* Items List */}
                <div className="space-y-4">
                   {data.inventory.map((item, idx) => (
                      <div key={item.id} className="bg-ordem-panel border border-zinc-800 p-6 relative group hover:border-ordem-green transition-all">
                         <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                             <div className="md:col-span-5">
                                 <Input 
                                    value={item.name || ''} 
                                    onChange={e => updateItem(idx, 'name', e.target.value)} 
                                    className="font-title text-xl font-bold bg-transparent border-none p-0 focus:shadow-none placeholder:text-zinc-700" 
                                    placeholder="Nome do Item"
                                    wrapperClassName="mb-2"
                                 />
                                 <TextArea 
                                    value={item.description || ''} 
                                    onChange={e => updateItem(idx, 'description', e.target.value)} 
                                    className="bg-black/30 min-h-[60px] text-xs" 
                                    placeholder="Efeitos, modificações e descrição detalhada..."
                                 />
                             </div>

                             <div className="md:col-span-2">
                                 <div className="flex flex-col gap-1 w-full group mb-3">
                                    <label className="text-[10px] uppercase tracking-[0.2em] text-ordem-muted font-bold">Categoria</label>
                                    <select 
                                        className="bg-black/40 border-b border-ordem-border w-full py-1 text-ordem-green font-bold text-xs outline-none"
                                        value={item.category}
                                        onChange={e => updateItem(idx, 'category', e.target.value)}
                                    >
                                        {ITEM_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                 </div>
                                 
                                 {/* Prestige Category (I, II, III, IV) */}
                                 <div className="flex flex-col gap-1 w-full group">
                                     <label className="text-[10px] uppercase tracking-[0.2em] text-ordem-muted font-bold">Prestígio</label>
                                     <select
                                        className="bg-black/40 border-b border-ordem-border w-full py-1 text-white font-title font-bold outline-none"
                                        value={item.itemCategory || 0}
                                        onChange={e => updateItem(idx, 'itemCategory', parseInt(e.target.value))}
                                     >
                                         <option value={0}>0</option>
                                         <option value={1}>I</option>
                                         <option value={2}>II</option>
                                         <option value={3}>III</option>
                                         <option value={4}>IV</option>
                                     </select>
                                 </div>
                             </div>
                             
                             <div className="md:col-span-1 flex flex-col gap-4">
                                <div className="relative">
                                    <Hash className="absolute left-0 top-2 w-3 h-3 text-zinc-600"/>
                                    <Input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value))} className="pl-4 text-center" />
                                </div>
                                <div className="relative">
                                    <Weight className="absolute left-0 top-2 w-3 h-3 text-zinc-600"/>
                                    <Input type="number" value={item.weight} onChange={e => updateItem(idx, 'weight', parseFloat(e.target.value))} className="pl-4 text-center" />
                                </div>
                             </div>

                             <div className="md:col-span-4 flex justify-end">
                                 <Button variant="danger" onClick={() => removeItem(idx)} className="p-2"><Trash2 className="w-4 h-4" /></Button>
                             </div>
                         </div>

                         {/* Conditional Inputs: Weapon */}
                         {item.category === 'ARMA' && (
                             <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 md:grid-cols-12 gap-4">
                                 <div className="col-span-2 md:col-span-3">
                                     <label className="text-[8px] uppercase text-zinc-500 font-bold block mb-1">Tipo</label>
                                     <select className="w-full bg-black border border-zinc-800 text-xs text-white p-1" value={item.weaponType} onChange={e => updateItem(idx, 'weaponType', e.target.value)}>
                                         {WEAPON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                     </select>
                                 </div>
                                 <div className="col-span-2 md:col-span-3">
                                     <label className="text-[8px] uppercase text-zinc-500 font-bold block mb-1">Alcance</label>
                                     <select className="w-full bg-black border border-zinc-800 text-xs text-white p-1" value={item.range} onChange={e => updateItem(idx, 'range', e.target.value)}>
                                         {WEAPON_RANGES.map(t => <option key={t} value={t}>{t}</option>)}
                                     </select>
                                 </div>
                                 <div className="col-span-2 md:col-span-2">
                                     <label className="text-[8px] uppercase text-zinc-500 font-bold block mb-1">Empunhadura</label>
                                     <select className="w-full bg-black border border-zinc-800 text-xs text-white p-1" value={item.grip} onChange={e => updateItem(idx, 'grip', e.target.value)}>
                                         {WEAPON_GRIPS.map(t => <option key={t} value={t}>{t}</option>)}
                                     </select>
                                 </div>
                                 
                                 {/* Critical - Compact */}
                                 <div className="col-span-2 md:col-span-4">
                                     <label className="text-[8px] uppercase text-zinc-500 font-bold block mb-1">Crítico (Margem / Mult)</label>
                                     <div className="flex items-center gap-2">
                                         <Input value={item.criticalRange || ''} onChange={e => updateItem(idx, 'criticalRange', e.target.value)} className="text-center bg-black border-zinc-800 px-0" wrapperClassName="!w-10" />
                                         <span className="text-zinc-600">/</span>
                                         <Input value={item.criticalMultiplier || ''} onChange={e => updateItem(idx, 'criticalMultiplier', e.target.value)} className="text-center bg-black border-zinc-800 px-0" wrapperClassName="!w-10" />
                                     </div>
                                 </div>

                                 {/* DICE CONFIG & ROLLER */}
                                 <div className="col-span-2 md:col-span-12 mt-2 bg-black/40 border border-ordem-blood/30 p-2 flex items-center gap-2">
                                      <Crosshair className="w-4 h-4 text-ordem-blood" />
                                      <Input 
                                        type="number" 
                                        value={item.diceQty || 1} 
                                        onChange={e => updateItem(idx, 'diceQty', parseInt(e.target.value))} 
                                        className="w-16 text-center text-xs h-8 bg-black"
                                        wrapperClassName="w-auto"
                                      />
                                      <span className="text-zinc-500 font-mono text-xs">d</span>
                                      <select 
                                        value={item.diceFace || 20} 
                                        onChange={e => updateItem(idx, 'diceFace', parseInt(e.target.value))}
                                        className="bg-black text-white text-xs border border-zinc-700 h-8 px-1"
                                      >
                                          {[3,4,6,8,10,12,20].map(d => <option key={d} value={d}>{d}</option>)}
                                      </select>
                                      <span className="text-zinc-500 font-mono text-xs">+</span>
                                      <Input 
                                        type="number" 
                                        value={item.diceBonus || 0} 
                                        onChange={e => updateItem(idx, 'diceBonus', parseInt(e.target.value))} 
                                        className="w-16 text-center text-xs h-8 bg-black"
                                        wrapperClassName="w-auto"
                                      />
                                      
                                      <button 
                                        className="bg-ordem-blood text-white text-xs font-bold px-3 py-1 ml-2 hover:bg-red-700 transition-colors"
                                        onClick={() => {
                                            const res = rollDice(item.diceFace || 20, item.diceQty || 1, item.diceBonus || 0, `Ataque: ${item.name}`);
                                            setWeaponLastResults(prev => ({ ...prev, [idx]: res }));
                                        }}
                                      >
                                          ROLAR
                                      </button>

                                      {/* Last Result Display */}
                                      {weaponLastResults[idx] && (
                                          <div className="ml-auto bg-black border border-ordem-blood px-2 py-1 flex items-center gap-2 animate-in slide-in-from-left-2">
                                              <span className="text-[10px] text-zinc-500 uppercase">Dano:</span>
                                              <span className="text-ordem-blood font-black text-lg">{weaponLastResults[idx].total}</span>
                                              <span className="text-[8px] text-zinc-600 font-mono">
                                                  ({weaponLastResults[idx].rolls.join('+')} {weaponLastResults[idx].skillBonus >= 0 ? '+' : ''}{weaponLastResults[idx].skillBonus})
                                              </span>
                                          </div>
                                      )}
                                 </div>
                             </div>
                         )}

                         {/* Conditional Input: Shield */}
                         {item.category === 'ESCUDO' && (
                             <div className="mt-4 pt-4 border-t border-zinc-800">
                                 <Input 
                                     type="number" 
                                     label="Defesa (Bônus)" 
                                     value={item.defense || 0} 
                                     onChange={e => updateItem(idx, 'defense', parseInt(e.target.value))} 
                                     className="w-32"
                                 />
                             </div>
                         )}
                      </div>
                   ))}
                   <Button onClick={addItem} variant="secondary" className="w-full py-4 border-dashed"><Plus className="mr-2" /> Adicionar Item</Button>
                </div>
             </div>
        )}

        {/* ... Rest of tabs (Rituals, Powers, Documents) omitted for brevity as they are unchanged ... */}
        {/* === RITUALS TAB === */}
        {activeTab === 'rituals' && (
             <div className="space-y-6">
                 {/* DT Check */}
                 <div className="bg-ordem-panel p-4 border border-ordem-purple flex justify-between items-center">
                     <span className="text-ordem-purple font-bold uppercase tracking-widest">Limite de PD por Turno</span>
                     <span className="text-3xl font-title font-black text-white">{data.nex <= 5 ? 1 : Math.floor(data.nex / 5)}</span>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {data.rituals.map((ritual, idx) => (
                         <div key={ritual.id} className="bg-ordem-panel border border-zinc-800 p-6 relative group hover:border-ordem-purple transition-all">
                             <div className="absolute top-0 right-0 p-4 z-20">
                                 <Button variant="danger" onClick={() => removeRitual(idx)} className="p-1 h-8 w-8 flex items-center justify-center"><Trash2 className="w-4 h-4"/></Button>
                             </div>
                             
                             <Input 
                                value={ritual.name || ''} 
                                onChange={e => updateRitual(idx, 'name', e.target.value)} 
                                className="font-title text-xl font-bold bg-transparent border-none p-0 focus:shadow-none w-3/4 mb-4 text-ordem-purple" 
                                placeholder="Nome do Ritual"
                             />

                             <div className="grid grid-cols-2 gap-4 mb-4">
                                 <div>
                                     <label className="text-[8px] uppercase text-zinc-500 font-bold block mb-1">Elemento</label>
                                     <select 
                                        className={`w-full bg-black border-b border-zinc-700 text-sm font-bold p-1 outline-none ${ELEMENTS[ritual.element].split(' ')[0]}`}
                                        value={ritual.element}
                                        onChange={e => updateRitual(idx, 'element', e.target.value)}
                                     >
                                         {Object.keys(ELEMENTS).map(el => <option key={el} value={el} className="bg-black">{el}</option>)}
                                     </select>
                                 </div>
                                 <div>
                                     <label className="text-[8px] uppercase text-zinc-500 font-bold block mb-1">Círculo</label>
                                     <select 
                                        className="w-full bg-black border-b border-zinc-700 text-sm text-white font-bold p-1 outline-none"
                                        value={ritual.circle}
                                        onChange={e => updateRitual(idx, 'circle', parseInt(e.target.value))}
                                     >
                                         <option value={1} className="bg-black">1º Círculo</option>
                                         <option value={2} className="bg-black">2º Círculo</option>
                                         <option value={3} className="bg-black">3º Círculo</option>
                                         <option value={4} className="bg-black">4º Círculo</option>
                                     </select>
                                 </div>
                             </div>

                             <div className="grid grid-cols-3 gap-2 mb-4">
                                 <div className="bg-black/40 p-2 border border-zinc-800">
                                     <span className="block text-[8px] text-zinc-500 uppercase">Execução</span>
                                     <select 
                                        className="w-full bg-black text-xs text-white font-mono outline-none border-none"
                                        value={ritual.execution}
                                        onChange={e => updateRitual(idx, 'execution', e.target.value)}
                                     >
                                         {RITUAL_EXECUTIONS.map(ex => <option key={ex} value={ex} className="bg-black">{ex}</option>)}
                                     </select>
                                 </div>
                                 <div className="bg-black/40 p-2 border border-zinc-800">
                                     <span className="block text-[8px] text-zinc-500 uppercase">Alcance</span>
                                     <select 
                                        className="w-full bg-black text-xs text-white font-mono outline-none border-none"
                                        value={ritual.range}
                                        onChange={e => updateRitual(idx, 'range', e.target.value)}
                                     >
                                         {RITUAL_RANGES.map(r => <option key={r} value={r} className="bg-black">{r}</option>)}
                                     </select>
                                 </div>
                                 <div className="bg-black/40 p-2 border border-zinc-800">
                                     <span className="block text-[8px] text-zinc-500 uppercase">Alvo</span>
                                     <input value={ritual.target || ''} onChange={e => updateRitual(idx, 'target', e.target.value)} className="w-full bg-transparent text-xs text-white font-mono outline-none"/>
                                 </div>
                                 <div className="bg-black/40 p-2 border border-zinc-800">
                                     <span className="block text-[8px] text-zinc-500 uppercase">Duração</span>
                                     <input value={ritual.duration || ''} onChange={e => updateRitual(idx, 'duration', e.target.value)} className="w-full bg-transparent text-xs text-white font-mono outline-none"/>
                                 </div>
                                 <div className="bg-black/40 p-2 border border-zinc-800">
                                     <span className="block text-[8px] text-zinc-500 uppercase">Resistência</span>
                                     <input value={ritual.resistance || ''} onChange={e => updateRitual(idx, 'resistance', e.target.value)} className="w-full bg-transparent text-xs text-white font-mono outline-none"/>
                                 </div>
                                 <div className="bg-black/40 p-2 border border-zinc-800 relative overflow-hidden">
                                     <span className="block text-[8px] text-ordem-purple uppercase font-bold">Custo (PE)</span>
                                     <span className="text-xl font-bold text-white absolute bottom-1 right-2">{ritual.cost}</span>
                                 </div>
                             </div>

                             <div className="grid grid-cols-3 gap-4 mb-2">
                                <div className="col-span-2">
                                    <label className="text-[8px] uppercase text-ordem-blood font-bold block mb-1">Dano / Efeito Numérico</label>
                                    <Input value={ritual.damage || ''} onChange={e => updateRitual(idx, 'damage', e.target.value)} className="text-sm border-ordem-blood/50 text-ordem-blood" placeholder="Ex: 2d6"/>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[8px] uppercase text-zinc-500 font-bold block mb-1">DT</label>
                                    <Input value={ritual.dt || ''} onChange={e => updateRitual(idx, 'dt', e.target.value)} className="text-sm border-zinc-700 text-white text-center" placeholder="--"/>
                                </div>
                             </div>

                             <TextArea 
                                value={ritual.description || ''} 
                                onChange={e => updateRitual(idx, 'description', e.target.value)} 
                                className="bg-black/30 text-xs min-h-[80px]" 
                                placeholder="Descrição do efeito..."
                             />
                         </div>
                     ))}
                     <Button onClick={addRitual} variant="secondary" className="w-full py-4 border-dashed col-span-full"><Plus className="mr-2" /> Aprender Ritual</Button>
                 </div>
             </div>
        )}

        {/* === POWERS TAB === */}
        {activeTab === 'powers' && (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {data.powers.map((power, idx) => (
                        <div key={power.id} className={`bg-ordem-panel border p-6 relative group transition-all ${POWER_TYPES[power.type].split(' ')[1]}`}>
                             <div className="absolute top-0 right-0 p-4 z-20">
                                 <Button variant="danger" onClick={() => removePower(idx)} className="p-1 h-8 w-8 flex items-center justify-center"><Trash2 className="w-4 h-4"/></Button>
                             </div>
                             
                             <Input 
                                value={power.name || ''} 
                                onChange={e => updatePower(idx, 'name', e.target.value)} 
                                className={`font-title text-xl font-bold bg-transparent border-none p-0 focus:shadow-none w-3/4 mb-4 ${POWER_TYPES[power.type].split(' ')[0]}`}
                                placeholder="Nome do Poder"
                             />

                             <div className="mb-4">
                                <select 
                                    className="bg-black border border-zinc-800 text-xs text-white p-2 uppercase font-bold tracking-wider outline-none focus:border-white"
                                    value={power.type}
                                    onChange={e => updatePower(idx, 'type', e.target.value)}
                                >
                                    {Object.keys(POWER_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                             </div>

                             <TextArea 
                                value={power.description || ''} 
                                onChange={e => updatePower(idx, 'description', e.target.value)} 
                                className="bg-black/30 text-sm min-h-[100px] border-none" 
                                placeholder="Descrição..."
                             />
                        </div>
                    ))}
                    <Button onClick={addPower} variant="secondary" className="w-full py-4 border-dashed col-span-full"><Plus className="mr-2" /> Adicionar Poder</Button>
                </div>
            </div>
        )}

        {/* === DOCUMENTS TAB === */}
        {activeTab === 'documents' && (
            <div className="space-y-8">
                
                {/* 1. MISSION FILES (Campaign Centralized) */}
                <div>
                     <h3 className="text-white font-title font-bold uppercase tracking-widest mb-6 border-l-4 border-ordem-purple pl-3 flex items-center gap-2">
                         <FolderOpen className="text-ordem-purple" /> Arquivos da Missão (Físico)
                     </h3>
                     {myMissionFiles.length === 0 ? (
                         <div className="text-zinc-600 italic text-sm border border-dashed border-zinc-800 p-8 text-center bg-black/20">
                             Você não possui evidências físicas no inventário.
                         </div>
                     ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                             {myMissionFiles.map(doc => (
                                 <div key={doc.id} className="bg-ordem-panel border border-zinc-700 hover:border-ordem-purple p-5 group relative">
                                     <div className="flex justify-between items-start mb-2">
                                         <h4 className="text-lg font-bold text-white">{doc.name}</h4>
                                         {doc.link && <button onClick={() => setViewingDoc(doc.link)}><Eye className="w-4 h-4 text-zinc-500 hover:text-white" /></button>}
                                     </div>
                                     <p className="text-zinc-400 text-xs line-clamp-3 mb-4">{doc.description}</p>
                                     <div className="flex justify-between items-center border-t border-zinc-800 pt-3">
                                         <div className="flex flex-col gap-1 text-[10px] text-zinc-500 uppercase">
                                             <span>Local: {doc.location || '?'}</span>
                                             <span>Data: {doc.date || '?'}</span>
                                         </div>
                                         <Button onClick={() => setSharingArchive(doc)} variant="secondary" className="text-[10px] px-3 py-1 h-auto whitespace-nowrap">
                                             <Share2 className="w-3 h-3 mr-1" /> Compartilhar
                                         </Button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                </div>

                {/* 2. SHARED WITH ME */}
                <div>
                     <h3 className="text-white font-title font-bold uppercase tracking-widest mb-6 border-l-4 border-ordem-green pl-3 flex items-center gap-2">
                         <Share2 className="text-ordem-green" /> Compartilhado Comigo
                     </h3>
                     {allSharedDocs.length === 0 ? (
                         <div className="text-zinc-600 italic text-sm border border-dashed border-zinc-800 p-8 text-center bg-black/20">
                             Nenhum documento compartilhado com você.
                         </div>
                     ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                             {allSharedDocs.map(doc => (
                                 <div key={doc.id} className="bg-black/40 border border-zinc-800 p-5 opacity-80 hover:opacity-100 transition-all">
                                     <div className="flex justify-between items-start mb-2">
                                         <h4 className="text-lg font-bold text-zinc-300">{doc.name}</h4>
                                         {doc.link && <button onClick={() => setViewingDoc(doc.link)}><Eye className="w-4 h-4 text-zinc-500 hover:text-white" /></button>}
                                     </div>
                                     <p className="text-zinc-500 text-xs line-clamp-3 mb-4">{doc.description}</p>
                                     <div className="flex justify-between items-end">
                                         <div className="text-[9px] text-zinc-600 uppercase">
                                             Origem: <span className="text-zinc-400">{doc.ownerName}</span>
                                         </div>
                                         <div className="text-[10px] text-ordem-green uppercase font-bold">
                                             Visualização Apenas
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                </div>

                {/* 3. PERSONAL NOTES (Legacy) */}
                <div>
                    <div className="flex justify-between items-center mb-6 border-l-4 border-zinc-500 pl-3">
                         <h3 className="text-white font-title font-bold uppercase tracking-widest">Notas Pessoais</h3>
                         <Button onClick={addDocument} variant="secondary"><Plus className="w-4 h-4 mr-2" /> Nova Nota</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data.documents.map((doc, idx) => (
                            <div key={doc.id} className="bg-ordem-panel border border-zinc-800 p-6 relative">
                                 <div className="absolute top-0 right-0 p-4 z-10">
                                     <Button variant="danger" onClick={() => removeDocument(idx)} className="p-1 h-8 w-8 flex items-center justify-center"><Trash2 className="w-4 h-4"/></Button>
                                 </div>
                                 
                                 {doc.link && (
                                     <div className="absolute top-0 right-14 p-4 z-10">
                                          <button onClick={() => setViewingDoc(doc.link)} className="text-zinc-500 hover:text-white p-1"><Maximize2 className="w-5 h-5"/></button>
                                     </div>
                                 )}

                                 <Input value={doc.name || ''} onChange={e => updateDocument(idx, 'name', e.target.value)} className="font-title text-xl font-bold bg-transparent border-none p-0 focus:shadow-none w-3/4 mb-4" placeholder="Título"/>
                                 
                                 <div className="grid grid-cols-2 gap-4 mb-4">
                                     <Input value={doc.location || ''} onChange={e => updateDocument(idx, 'location', e.target.value)} placeholder="Local..." className="text-xs bg-transparent"/>
                                     <Input value={doc.date || ''} onChange={e => updateDocument(idx, 'date', e.target.value)} placeholder="Data..." className="text-xs bg-transparent"/>
                                 </div>

                                 <TextArea value={doc.description || ''} onChange={e => updateDocument(idx, 'description', e.target.value)} className="bg-black/30 min-h-[100px] text-sm" placeholder="Anotações..."/>
                                 
                                 <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                                     <div className="flex items-center gap-2 flex-grow">
                                         <Paperclip className="w-4 h-4 text-zinc-500"/>
                                         <Input value={doc.link || ''} onChange={e => updateDocument(idx, 'link', e.target.value)} placeholder="URL da Imagem/Anexo..." className="text-xs bg-transparent border-none"/>
                                     </div>
                                     
                                     {/* NEW: Use Share Modal for Personal Notes instead of Toggle */}
                                     <Button 
                                        onClick={() => setSharingArchive(doc)} 
                                        variant="secondary" 
                                        className="ml-2 text-[10px] px-3 py-1 h-auto whitespace-nowrap"
                                     >
                                         <Share2 className="w-3 h-3 mr-1" /> Compartilhar
                                     </Button>
                                 </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};