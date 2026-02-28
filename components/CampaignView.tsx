import React, { useState, useEffect, useRef } from 'react';
import { Campaign, CharacterSummary, RuleBlock, DMNote, SharedDocument, CampaignArchive, CombatEntry, Character, CampaignMember } from '../types';
import { dbService } from '../services/dbService';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Input';
import { CharacterCard } from './CharacterCard';
import { LockScreen } from './LockScreen';
import { MapView } from './MapView';
import { Shield, BookOpen, Users, Plus, Lock, Unlock, Settings, ArrowLeft, Trash2, GripVertical, AlertTriangle, FileLock2, Save, LayoutDashboard, ArrowRight, ArrowLeftIcon, X, FileText, Maximize2, MapPin, Calendar, Eye, FolderOpen, Link as LinkIcon, Paperclip, Check, Star, Sword, ChevronUp, ChevronDown, Skull, Map as MapIcon, Copy, Move, ArrowDownRight, User, ExternalLink, Share2, Globe, EyeOff, Dices, Swords, Play, Pause, UserPlus, LogOut, Crown, UserCheck, Key } from 'lucide-react';
import { CLASS_COLORS } from '../constants';

interface Props {
  campaign: Campaign;
  role: 'ADMIN' | 'PLAYER';
  onBack: () => void;
  onSelectCharacter: (char: CharacterSummary) => void;
  onCreateCharacter: () => void;
  onDeleteCampaign: () => void; 
  onAdminOpenSheet?: (charId: string) => void;
}

// --- SmartNoteEditor Component ---
const SmartNoteEditor = React.memo(({
    initialContent,
    onChange,
    characters,
    onOpenSheet
}: {
    initialContent: string;
    onChange: (val: string) => void;
    characters: CharacterSummary[];
    onOpenSheet?: (charId: string) => void;
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const [showSuggestions, setShowSuggestions] = useState(false);
    const [query, setQuery] = useState('');
    const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== initialContent) {
            if (!editorRef.current.innerHTML) editorRef.current.innerHTML = initialContent;
        }
    }, []);

    const filteredChars = characters.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

    const handleInput = () => {
        if (!editorRef.current) return;
        onChangeRef.current(editorRef.current.innerHTML);

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            const textNode = range.startContainer;
            const textBeforeCursor = textNode.textContent?.slice(0, range.startOffset) || '';
            const match = textBeforeCursor.match(/@(\w*)$/);

            if (match) {
                setQuery(match[1]);
                setShowSuggestions(true);
                setSelectedIndex(0);
                
                const editorRect = editorRef.current.getBoundingClientRect();
                setSuggestionPos({
                    top: rect.bottom - editorRect.top + 20, 
                    left: rect.left - editorRect.left
                });
            } else {
                setShowSuggestions(false);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showSuggestions && filteredChars.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredChars.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredChars.length) % filteredChars.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(filteredChars[selectedIndex]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowSuggestions(false);
            }
        }
    };

    const insertMention = (char: CharacterSummary) => {
        if (!editorRef.current) return;
        
        editorRef.current.focus();
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        
        const textNode = range.startContainer;
        if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
            const textBefore = textNode.textContent.slice(0, range.startOffset);
            const atIndex = textBefore.lastIndexOf('@');
            if (atIndex !== -1) {
                range.setStart(textNode, atIndex);
                range.setEnd(textNode, range.endOffset);
                range.deleteContents();
            }
        }

        const span = document.createElement('span');
        span.textContent = `@${char.name}`;
        span.contentEditable = "false";
        span.dataset.charId = char.id;
        
        const colorClass = CLASS_COLORS[char.class] || 'text-white';
        span.className = `font-bold cursor-pointer hover:underline mx-1 ${colorClass}`;
        
        range.insertNode(span);
        
        const space = document.createTextNode('\u00A0');
        range.setStartAfter(span);
        range.insertNode(space);
        
        range.setStartAfter(space);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        setShowSuggestions(false);
        onChangeRef.current(editorRef.current.innerHTML);
    };

    const handleClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.dataset.charId) {
            setSelectedCharId(target.dataset.charId);
            const rect = target.getBoundingClientRect();
            const editorRect = editorRef.current!.getBoundingClientRect();
            setPopoverPos({
                top: rect.bottom - editorRect.top,
                left: rect.left - editorRect.left
            });
        } else {
            setSelectedCharId(null);
        }
    };

    return (
        <div className="relative w-full h-full">
            <div
                ref={editorRef}
                contentEditable
                className="w-full h-full bg-black/30 text-sm p-2 outline-none border-none resize-none overflow-y-auto font-mono text-zinc-300"
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onClick={handleClick}
                style={{ minHeight: '100px' }} 
            />
            
            {showSuggestions && filteredChars.length > 0 && (
                <div 
                    className="absolute z-50 bg-black border border-zinc-700 shadow-xl max-h-40 overflow-y-auto w-48 custom-scrollbar"
                    style={{ top: suggestionPos.top, left: suggestionPos.left }}
                >
                    {filteredChars.map((char, idx) => (
                        <div 
                            key={char.id}
                            className={`p-2 cursor-pointer flex items-center gap-2 ${idx === selectedIndex ? 'bg-zinc-800 border-l-2 border-ordem-purple' : 'hover:bg-zinc-900'}`}
                            onClick={(e) => { e.stopPropagation(); insertMention(char); }}
                        >
                            <span className={`w-2 h-2 rounded-full ${char.class === 'Combatente' ? 'bg-ordem-blood' : char.class === 'Ocultista' ? 'bg-ordem-purple' : 'bg-yellow-500'}`}></span>
                            <span className="text-xs text-white font-bold">{char.name}</span>
                        </div>
                    ))}
                </div>
            )}

            {selectedCharId && (
                <div 
                    className="absolute z-50 bg-black border border-ordem-purple p-2 shadow-[0_0_15px_rgba(124,58,237,0.5)] rounded animate-in fade-in zoom-in-95 duration-150"
                    style={{ top: popoverPos.top + 10, left: popoverPos.left }}
                >
                    <div className="flex gap-2">
                        <Button 
                            variant="primary" 
                            className="text-[10px] px-2 py-1 h-auto"
                            onClick={() => onOpenSheet && onOpenSheet(selectedCharId)}
                        >
                            <ExternalLink className="w-3 h-3 mr-1" /> Acessar Ficha
                        </Button>
                        <button onClick={() => setSelectedCharId(null)} className="text-zinc-500 hover:text-white"><X className="w-3 h-3"/></button>
                    </div>
                </div>
            )}
        </div>
    );
}, (prev, next) => {
    return prev.characters === next.characters && prev.onOpenSheet === next.onOpenSheet;
});


export const CampaignView: React.FC<Props> = ({ 
  campaign, 
  role,
  onBack, 
  onSelectCharacter, 
  onCreateCharacter,
  onDeleteCampaign,
  onAdminOpenSheet
}) => {
  const [localCampaign, setLocalCampaign] = useState<Campaign>(campaign);
  const [activeTab, setActiveTab] = useState<'agents' | 'manual' | 'evidences' | 'map' | 'gm_notes' | 'dm_screen' | 'master_archives'>('agents');
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [archives, setArchives] = useState<CampaignArchive[]>(localCampaign.archives || []);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [deletingArchiveIndex, setDeletingArchiveIndex] = useState<number | null>(null);
  const [playerDocs, setPlayerDocs] = useState<SharedDocument[]>([]);
  const [sharingDoc, setSharingDoc] = useState<SharedDocument | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [gmNotes, setGmNotes] = useState(localCampaign.gmNotes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [dmScreen, setDmScreen] = useState<DMNote[]>(localCampaign.dmScreen || []);
  const [isSavingScreen, setIsSavingScreen] = useState(false);
  const [deletingNoteIndex, setDeletingNoteIndex] = useState<number | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [resizing, setResizing] = useState<{index: number, startX: number, startY: number, startCol: number, startRow: number} | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dmScreenRef = useRef(dmScreen);
  const [combatInitiatives, setCombatInitiatives] = useState<CombatEntry[]>(localCampaign.combatInitiatives || []);
  const [monsterForm, setMonsterForm] = useState({ name: '', initiative: '' });
  const [showInitModal, setShowInitModal] = useState(false);
  const [initRollCharId, setInitRollCharId] = useState<string>('');
  const [manualInitValue, setManualInitValue] = useState('');
  const [deleteStep, setDeleteStep] = useState(0); 
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  
  // Member Management State
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Character Assignment State
  const [assigningCharId, setAssigningCharId] = useState<string | null>(null);

  // Current User
  const currentUser = JSON.parse(localStorage.getItem("sessionUser") || "{}");
  
  // PERMISSIONS LOGIC
  const isGlobalAdmin = currentUser.isGlobalAdmin;
  const isOwner = currentUser.id === localCampaign.ownerId || isGlobalAdmin; // Can Delete, Set GM
  const isGM = currentUser.id === localCampaign.gmId || isOwner; // Can Edit, See Notes
  
  // Used for "Admin View" flag (Visual tools)
  const isAdminView = isGM;

  useEffect(() => {
      dmScreenRef.current = dmScreen;
  }, [dmScreen]);

  const initialManual = Array.isArray(localCampaign.manual) 
    ? localCampaign.manual 
    : [{ id: 'legacy', title: 'Regras Gerais', content: String(localCampaign.manual || '') }];

  const [editData, setEditData] = useState({
      name: localCampaign.name,
      summary: localCampaign.summary,
      manual: initialManual as RuleBlock[]
  });

  useEffect(() => {
    loadCharacters();
    loadFavorites();
    setLocalCampaign(campaign);

    const campSub = dbService.subscribeToCampaign(campaign.id, (newData) => {
        setLocalCampaign(newData);
        setArchives(newData.archives || []);
        setCombatInitiatives(newData.combatInitiatives || []);
        
        if (!isSavingNotes) setGmNotes(newData.gmNotes || '');
        if (!isSavingScreen && !resizing && draggedItemIndex === null) setDmScreen(newData.dmScreen || []);
        
        if (!isEditing) {
             const updatedManual = Array.isArray(newData.manual) ? newData.manual : [{ id: 'leg', title: 'R', content: String(newData.manual)}];
             setEditData({
                 name: newData.name,
                 summary: newData.summary,
                 manual: updatedManual as RuleBlock[]
             });
        }
    });

    const charListSub = dbService.subscribeToCharacterList(campaign.id, () => {
        loadCharacters();
    });

    return () => {
        campSub.unsubscribe();
        charListSub.unsubscribe();
    };
  }, [campaign.id, campaign]);

  useEffect(() => {
    setArchives(localCampaign.archives || []);
    setCombatInitiatives(localCampaign.combatInitiatives || []);
  }, [localCampaign.archives, localCampaign.combatInitiatives]);

  useEffect(() => {
      if (isAdminView && activeTab === 'evidences') {
          loadPlayerDocs();
      }
  }, [isAdminView, activeTab, campaign.id]);

  const loadPlayerDocs = async () => {
      const docs = await dbService.getAllCampaignDocuments(campaign.id);
      setPlayerDocs(docs);
  };

  const loadCharacters = async () => {
    setLoading(true);
    const list = await dbService.listCharacters(campaign.id);
    setCharacters(list);
    setLoading(false);
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem('ordem_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  };

  const toggleFavorite = (charId: string) => {
    const newFavorites = favorites.includes(charId) 
      ? favorites.filter(id => id !== charId) 
      : [...favorites, charId];
    
    setFavorites(newFavorites);
    localStorage.setItem('ordem_favorites', JSON.stringify(newFavorites));
  };

  const toggleCharacterHidden = async (charId: string, currentStatus: boolean) => {
      if (!isAdminView) return;
      await dbService.updateCharacterPartial(charId, { hidden: !currentStatus });
  };

  const handleSave = async () => {
      let updated = {
          ...localCampaign,
          name: editData.name,
          summary: editData.summary,
          manual: editData.manual
      };
      await dbService.updateCampaign(updated);
      setIsEditing(false);
      setLocalCampaign(updated);
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    const updated = { ...localCampaign, gmNotes: gmNotes };
    await dbService.updateCampaign(updated);
    setLocalCampaign(updated);
    setIsSavingNotes(false);
  };

  const saveScreenState = async (screenData: DMNote[]) => {
    const updated = { ...localCampaign, dmScreen: screenData };
    await dbService.updateCampaign(updated);
    setLocalCampaign(updated);
  };

  const handleSaveScreen = async () => {
    setIsSavingScreen(true);
    await saveScreenState(dmScreen);
    setIsSavingScreen(false);
  };

  const handleSaveArchives = async () => {
      const updated = { ...localCampaign, archives: archives };
      await dbService.updateCampaign(updated);
      setLocalCampaign(updated);
  }

  const handleSaveAllAndExit = async () => {
      setIsSavingAll(true);
      const updated = {
          ...localCampaign,
          name: isEditing ? editData.name : localCampaign.name,
          summary: isEditing ? editData.summary : localCampaign.summary,
          manual: isEditing ? editData.manual : localCampaign.manual,
          gmNotes: gmNotes,
          dmScreen: dmScreen,
          archives: archives,
          combatInitiatives: combatInitiatives
      };
      await dbService.updateCampaign(updated);
      setIsSavingAll(false);
      setShowExitModal(false);
      onBack();
  };

  const handleDeletePlayerDoc = async (doc: SharedDocument) => {
      if(!window.confirm(`Excluir permanentemente a nota "${doc.name}" de ${doc.ownerName}?`)) return;
      
      setPlayerDocs(prev => prev.filter(d => d.id !== doc.id));
      
      try {
          const char = await dbService.getCharacterById(doc.characterId);
          if (!char) {
             loadPlayerDocs();
             return;
          }

          const currentDocs = char.documents || [];
          const updatedDocs = currentDocs.filter(d => d.id !== doc.id);
          await dbService.updateCharacter({ ...char, documents: updatedDocs });
      } catch (error) {
          console.error("Failed to delete document", error);
      } finally {
          loadPlayerDocs(); 
      }
  };

  const handleUpdateShare = async (targetId: string, isPublic: boolean) => {
    if (!sharingDoc) return;
    
    const char = await dbService.getCharacterById(sharingDoc.characterId);
    if (!char) return;
    
    const docIndex = char.documents.findIndex(d => d.id === sharingDoc.id);
    if (docIndex === -1) return;
    
    const updatedDoc = { ...char.documents[docIndex] };
    updatedDoc.sharedWith = updatedDoc.sharedWith || [];

    if (isPublic) {
         updatedDoc.isPublic = !updatedDoc.isPublic;
    } else {
         if (updatedDoc.sharedWith.includes(targetId)) {
             updatedDoc.sharedWith = updatedDoc.sharedWith.filter(id => id !== targetId);
         } else {
             updatedDoc.sharedWith.push(targetId);
         }
    }
    
    const newDocs = [...char.documents];
    newDocs[docIndex] = updatedDoc;
    
    await dbService.updateCharacter({ ...char, documents: newDocs });
    setSharingDoc({ ...sharingDoc, ...updatedDoc });
    loadPlayerDocs();
  };

  const toggleCombat = async () => {
      if (!isGM) return;
      const newState = !localCampaign.isCombatActive;
      const updated = {
          ...localCampaign,
          isCombatActive: newState,
          combatInitiatives: newState ? [] : localCampaign.combatInitiatives 
      };
      await dbService.updateCampaign(updated);
      setLocalCampaign(updated);
      setCombatInitiatives(updated.combatInitiatives || []);
  };

  const updateCombatInitiatives = async (newList: CombatEntry[]) => {
      setCombatInitiatives(newList);
      const updated = { ...localCampaign, combatInitiatives: newList };
      await dbService.updateCampaign(updated);
  };

  const handleAddMonster = async () => {
      if (!monsterForm.name || !monsterForm.initiative) return;
      const val = parseInt(monsterForm.initiative);
      if (isNaN(val)) return;

      const newMonster: CombatEntry = {
          characterId: crypto.randomUUID(),
          name: monsterForm.name,
          initiative: val,
          originalRoll: val,
          bonus: 0,
          type: 'MONSTER'
      };
      const newList = [...combatInitiatives, newMonster].sort((a,b) => b.initiative - a.initiative);
      await updateCombatInitiatives(newList);
      setMonsterForm({ name: '', initiative: '' });
  };

  const moveCombatant = (index: number, direction: 'up' | 'down') => {
      if (!isGM) return;
      if (direction === 'up' && index > 0) {
          const newList = [...combatInitiatives];
          const temp = newList[index];
          newList[index] = newList[index-1];
          newList[index-1] = temp;
          updateCombatInitiatives(newList);
      } else if (direction === 'down' && index < combatInitiatives.length - 1) {
          const newList = [...combatInitiatives];
          const temp = newList[index];
          newList[index] = newList[index+1];
          newList[index+1] = temp;
          updateCombatInitiatives(newList);
      }
  };

  const removeCombatant = (index: number) => {
      if (!isGM) return;
      const newList = combatInitiatives.filter((_, i) => i !== index);
      updateCombatInitiatives(newList);
  };

  const handleAutoInitRoll = async () => {
      if (!initRollCharId) return;
      const charData = await dbService.getCharacterById(initRollCharId);
      if (!charData) return;

      const agi = charData.attributes.AGI;
      const initSkill = charData.skills.find(s => s.name === 'Iniciativa');
      const bonus = (initSkill?.value || 0) + (initSkill?.bonus || 0);

      const diceToRoll = agi <= 0 ? 2 : agi;
      const rolls = [];
      for(let i=0; i<diceToRoll; i++) rolls.push(Math.floor(Math.random() * 20) + 1);
      const rollValue = agi <= 0 ? Math.min(...rolls) : Math.max(...rolls);
      const total = rollValue + bonus;

      const currentList = combatInitiatives.filter(e => e.characterId !== initRollCharId);
      const newEntry: CombatEntry = {
          characterId: initRollCharId,
          name: charData.name,
          initiative: total,
          originalRoll: rollValue,
          bonus: bonus,
          type: 'PLAYER'
      };
      
      const newList = [...currentList, newEntry].sort((a,b) => b.initiative - a.initiative);
      await updateCombatInitiatives(newList);
      setShowInitModal(false);
  };

  const handleManualInit = async () => {
      if (!initRollCharId || !manualInitValue) return;
      const charData = await dbService.getCharacterById(initRollCharId);
      if (!charData) return;

      const val = parseInt(manualInitValue);
      if (isNaN(val)) return;

      const initSkill = charData.skills.find(s => s.name === 'Iniciativa');
      const bonus = (initSkill?.value || 0) + (initSkill?.bonus || 0);
      const total = val + bonus;

      const currentList = combatInitiatives.filter(e => e.characterId !== initRollCharId);
      const newEntry: CombatEntry = {
          characterId: initRollCharId,
          name: charData.name,
          initiative: total,
          originalRoll: val,
          bonus: bonus,
          type: 'PLAYER'
      };
      
      const newList = [...currentList, newEntry].sort((a,b) => b.initiative - a.initiative);
      await updateCombatInitiatives(newList);
      setShowInitModal(false);
      setManualInitValue('');
  };

  const hasUnsavedChanges = () => {
      const notesChanged = isAdminView && gmNotes !== (localCampaign.gmNotes || '');
      const screenChanged = isAdminView && JSON.stringify(dmScreen) !== JSON.stringify(localCampaign.dmScreen || []);
      const archivesChanged = isAdminView && JSON.stringify(archives) !== JSON.stringify(localCampaign.archives || []);
      const originalManual = Array.isArray(localCampaign.manual) ? localCampaign.manual : [];
      const manualChanged = isAdminView && isEditing && JSON.stringify(editData.manual) !== JSON.stringify(originalManual);
      const detailsChanged = isAdminView && isEditing && (editData.name !== localCampaign.name || editData.summary !== localCampaign.summary);
      return notesChanged || screenChanged || manualChanged || detailsChanged || archivesChanged;
  };

  const handleBackClick = () => {
      if (hasUnsavedChanges()) {
          setShowExitModal(true);
      } else {
          onBack();
      }
  };

  const handleExitDiscard = () => {
      setShowExitModal(false);
      onBack();
  };

  const addScreenNote = () => {
    const newNote: DMNote = {
      id: crypto.randomUUID(),
      title: 'Nova Nota',
      content: '',
      color: 'gray',
      colSpan: 4, 
      rowSpan: 12
    };
    setDmScreen(prev => [...prev, newNote]);
  };

  const updateScreenNote = (index: number, field: keyof DMNote, value: any) => {
    setDmScreen(prev => {
        const newScreen = [...prev];
        newScreen[index] = { ...newScreen[index], [field]: value };
        return newScreen;
    });
  };

  const removeScreenNote = (index: number) => {
    const newScreen = dmScreen.filter((_, i) => i !== index);
    setDmScreen(newScreen);
    setDeletingNoteIndex(null);
    saveScreenState(newScreen);
  };

  const handleDragStart = (index: number) => setDraggedItemIndex(index);

  const handleDragEnter = (index: number) => {
      if (draggedItemIndex === null || draggedItemIndex === index) return;
      const newScreen = [...dmScreen];
      const item = newScreen[draggedItemIndex];
      newScreen.splice(draggedItemIndex, 1);
      newScreen.splice(index, 0, item);
      setDmScreen(newScreen);
      setDraggedItemIndex(index);
  };

  const handleDragEnd = async () => {
      setDraggedItemIndex(null);
      await saveScreenState(dmScreen);
  };

  const startResize = (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing({
          index,
          startX: e.clientX,
          startY: e.clientY,
          startCol: dmScreen[index].colSpan || 4,
          startRow: dmScreen[index].rowSpan || 12
      });
  };

  useEffect(() => {
      if (!resizing) return;
      const handleMouseMove = (e: MouseEvent) => {
          if (!gridRef.current) return;
          const gridRect = gridRef.current.getBoundingClientRect();
          const colUnit = gridRect.width / 12;
          const deltaX = e.clientX - resizing.startX;
          const deltaY = e.clientY - resizing.startY;
          const colsDiff = Math.round(deltaX / colUnit);
          const rowsDiff = Math.round(deltaY / 30);
          const newCol = Math.max(2, Math.min(12, resizing.startCol + colsDiff));
          const newRow = Math.max(4, Math.min(40, resizing.startRow + rowsDiff));
          setDmScreen(prev => {
              const next = [...prev];
              next[resizing.index] = { ...next[resizing.index], colSpan: newCol, rowSpan: newRow };
              return next;
          });
      };
      const handleMouseUp = async () => {
          setResizing(null);
          await saveScreenState(dmScreenRef.current);
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [resizing]);

  const addArchive = () => {
      const newArchive: CampaignArchive = {
          id: crypto.randomUUID(),
          name: 'Novo Documento',
          description: '',
          location: '',
          date: '',
          link: '',
          holders: [],
          sharedWith: [],
          isPublic: false
      };
      setArchives(prev => [newArchive, ...prev]);
  };

  const updateArchive = (index: number, field: keyof CampaignArchive, value: any) => {
      const newArchives = [...archives];
      newArchives[index] = { ...newArchives[index], [field]: value };
      setArchives(newArchives);
  };

  const toggleArchiveHolder = (archiveIndex: number, charId: string) => {
      const archive = archives[archiveIndex];
      let newHolders = [...archive.holders];
      if (newHolders.includes(charId)) newHolders = newHolders.filter(id => id !== charId);
      else newHolders.push(charId);
      updateArchive(archiveIndex, 'holders', newHolders);
  };

  const confirmRemoveArchive = (index: number) => {
      setArchives(prev => prev.filter((_, i) => i !== index));
      setDeletingArchiveIndex(null);
  }

  const handleCampaignDelete = async () => {
      if (deleteStep === 0) setDeleteStep(1);
      else if (deleteStep === 1) {
            await dbService.deleteCampaign(localCampaign.id);
            onDeleteCampaign();
      }
  };

  const cancelDelete = () => {
      setDeleteStep(0);
  };

  const addBlock = () => {
    setEditData(prev => ({ ...prev, manual: [...prev.manual, { id: crypto.randomUUID(), title: 'Nova Seção', content: '' }] }));
  };

  const updateBlock = (index: number, field: keyof RuleBlock, value: string) => {
    const newManual = [...editData.manual];
    newManual[index] = { ...newManual[index], [field]: value };
    setEditData(prev => ({ ...prev, manual: newManual }));
  };

  const removeBlock = (index: number) => {
    if (window.confirm('Tem certeza que deseja remover esta seção de regras?')) {
      const newManual = editData.manual.filter((_, i) => i !== index);
      setEditData(prev => ({ ...prev, manual: newManual }));
    }
  };

  // --- Member Management ---
  const handleOpenMembers = async () => {
      setShowMembersModal(true);
      const list = await dbService.getCampaignMembers(campaign.id);
      setMembers(list);
  }

  const handleInvite = async () => {
      if(!inviteUsername) return;
      setInviteLoading(true);
      setInviteError('');
      try {
          await dbService.inviteUserToCampaign(campaign.id, inviteUsername.trim(), 'PLAYER');
          const list = await dbService.getCampaignMembers(campaign.id);
          setMembers(list);
          setInviteUsername('');
      } catch (e: any) {
          setInviteError(e.message);
      } finally {
          setInviteLoading(false);
      }
  }

  const handleKick = async (e: React.MouseEvent, userId: string) => {
      e.stopPropagation();
      if(window.confirm("Remover este membro da campanha?")) {
          try {
              await dbService.removeMember(localCampaign.id, userId);
              const list = await dbService.getCampaignMembers(localCampaign.id);
              setMembers(list);
          } catch (err: any) {
              alert("Erro ao remover membro: " + err.message);
          }
      }
  }
  
  // Previously transferred Ownership, now sets GM
  const handleSetGM = async (e: React.MouseEvent, newGmId: string, memberName: string) => {
      e.stopPropagation();
      if (!isOwner) return;
      if (window.confirm(`ATENÇÃO: Definir "${memberName}" como Mestre (GM) da campanha?\nEles terão acesso total às ferramentas de mestre.`)) {
          try {
              await dbService.setCampaignGM(localCampaign.id, newGmId);
              alert("Mestre definido com sucesso.");
              window.location.reload();
          } catch (e: any) {
              alert("Erro ao definir Mestre: " + e.message);
          }
      }
  }
  
  const handleTransferOwnership = async (e: React.MouseEvent, newOwnerId: string, memberName: string) => {
      e.stopPropagation();
      if (!isOwner) return; // Only Admin/Owner can transfer ownership
      if (window.confirm(`PERIGO: Transferir a POSSE TOTAL da campanha para "${memberName}"?\n\nVocê deixará de ser o Admin e não poderá mais excluir a campanha.\nO novo dono terá controle absoluto.`)) {
          try {
              await dbService.transferCampaignOwnership(localCampaign.id, newOwnerId);
              alert("Posse transferida com sucesso. Você agora é um Mestre (GM).");
              window.location.reload();
          } catch (e: any) {
              alert("Erro ao transferir posse: " + e.message);
          }
      }
  }

  // --- Character Assignment ---
  const handleOpenAssign = async (charId: string) => {
      setAssigningCharId(charId);
      // Ensure we have members list
      if (members.length === 0) {
          const list = await dbService.getCampaignMembers(campaign.id);
          setMembers(list);
      }
  }

  const handleAssignPlayer = async (userId: string) => {
      if (!assigningCharId) return;
      try {
          await dbService.updateCharacterPartial(assigningCharId, { ownerId: userId });
          // Refresh characters
          loadCharacters();
          setAssigningCharId(null);
      } catch (e: any) {
          alert("Erro ao vincular jogador: " + e.message);
      }
  }

  const publicArchives = archives.filter(a => a.isPublic);
  const sortedCharacters = [...characters].sort((a, b) => {
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0; 
  });

  const displayedCharacters = isAdminView 
      ? sortedCharacters 
      : sortedCharacters.filter(c => !c.hidden);

  const availableCharacters = isAdminView 
      ? characters 
      : characters.filter(c => !c.hidden);

  const renderCombatBar = () => (
      <div className="bg-black border-y border-ordem-blood/30 relative animate-in slide-in-from-top duration-500">
          <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-ordem-blood">
                      <Swords className="w-6 h-6 animate-pulse" />
                      <span className="font-title font-black tracking-widest text-xl">COMBATE</span>
                  </div>
                  <div className="flex gap-2">
                      {isAdminView && <Button variant="ghost" onClick={() => setShowInitModal(true)} className="text-xs"><Plus className="w-4 h-4 mr-2"/> ADICIONAR NPC</Button>}
                      {!isAdminView && <Button variant="danger" onClick={() => setShowInitModal(true)} className="text-xs animate-pulse">ROLAR INICIATIVA</Button>}
                  </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {combatInitiatives.map((entry, idx) => (
                      <div key={idx} className={`relative border p-3 flex flex-col gap-1 transition-all bg-zinc-900 border-zinc-700`}>
                          <div className="flex justify-between items-start">
                              <span className="text-2xl font-black text-white/10 absolute top-0 right-2">#{idx + 1}</span>
                              <span className={`font-bold text-sm truncate pr-4 ${entry.type === 'MONSTER' ? 'text-ordem-blood' : 'text-white'}`}>{entry.name}</span>
                          </div>
                          
                          <div className="flex justify-between items-end mt-2">
                              <div className="flex flex-col">
                                  <span className="text-[10px] text-zinc-500 uppercase">Iniciativa</span>
                                  <span className="text-xl font-title font-bold text-white leading-none">{entry.initiative}</span>
                              </div>
                              
                              {isAdminView && (
                                  <div className="flex gap-1 relative z-10">
                                      <button onClick={() => moveCombatant(idx, 'up')} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"><ChevronUp className="w-4 h-4"/></button>
                                      <button onClick={() => moveCombatant(idx, 'down')} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"><ChevronDown className="w-4 h-4"/></button>
                                      <button onClick={() => removeCombatant(idx)} className="p-1 hover:bg-ordem-blood/20 rounded text-zinc-500 hover:text-ordem-blood"><X className="w-4 h-4"/></button>
                                  </div>
                              )}
                          </div>
                      </div>
                  ))}
                  {combatInitiatives.length === 0 && (
                      <div className="col-span-full text-center py-8 border border-dashed border-zinc-800 text-zinc-600 font-mono uppercase text-xs">
                          Aguardando Combatentes...
                      </div>
                  )}
              </div>
          </div>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      
      {/* --- MEMBERS MODAL --- */}
      {showMembersModal && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-ordem-panel border border-ordem-green p-6 max-w-lg w-full relative shadow-[0_0_50px_rgba(0,255,157,0.2)]">
                   <button onClick={() => setShowMembersModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X/></button>
                   <h3 className="text-xl font-title font-black text-ordem-green mb-6 flex items-center gap-2"><Users className="w-6 h-6"/> MEMBROS DA CAMPANHA</h3>

                   {/* Invite */}
                   <div className="bg-black/40 p-4 border border-zinc-700 mb-6">
                       <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Convidar Usuário (Username)</label>
                       <div className="flex gap-2">
                           <Input value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} placeholder="Username..." className="bg-black text-sm" />
                           <Button onClick={handleInvite} variant="secondary" isLoading={inviteLoading} className="px-4 text-xs"><UserPlus className="w-4 h-4 mr-2"/> CONVIDAR</Button>
                       </div>
                       {inviteError && <p className="text-red-500 text-xs font-bold mt-2">{inviteError}</p>}
                   </div>

                   {/* List */}
                   <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                       {members.length === 0 ? <p className="text-zinc-600 italic text-sm text-center">Nenhum membro convidado.</p> : members.map(m => (
                           <div key={m.id} className="flex justify-between items-center bg-zinc-900/50 p-2 border border-zinc-800">
                               <div className="flex items-center gap-3">
                                   <div className={`w-8 h-8 flex items-center justify-center bg-black border ${m.role === 'GM' ? 'border-ordem-blood text-ordem-blood' : 'border-ordem-green text-ordem-green'}`}>
                                       {m.role === 'GM' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                   </div>
                                   <div>
                                       <p className="text-white font-bold text-sm">{m.username}</p>
                                       <p className="text-[10px] text-zinc-500 uppercase">{m.role === 'GM' ? 'Mestre' : 'Jogador'}</p>
                                   </div>
                               </div>
                               <div className="flex gap-2">
                                   {isOwner && m.userId !== campaign.ownerId && (
                                       <>
                                            <button 
                                                onClick={(e) => handleSetGM(e, m.userId, m.username || 'Desconhecido')} 
                                                className={`p-2 transition-colors ${m.userId === localCampaign.gmId ? 'text-yellow-500 cursor-default' : 'text-zinc-600 hover:text-yellow-500'}`} 
                                                title={m.userId === localCampaign.gmId ? "Mestre Atual" : "Definir como Mestre (GM)"}
                                                disabled={m.userId === localCampaign.gmId}
                                            >
                                                <Crown className={`w-4 h-4 ${m.userId === localCampaign.gmId ? 'fill-yellow-500' : ''}`} />
                                            </button>
                                            
                                            <button 
                                                onClick={(e) => handleTransferOwnership(e, m.userId, m.username || 'Desconhecido')} 
                                                className="p-2 transition-colors text-zinc-600 hover:text-ordem-blood"
                                                title="Transferir Posse (Admin)"
                                            >
                                                <Key className="w-4 h-4" />
                                            </button>
                                       </>
                                   )}
                                   {m.role !== 'GM' && (
                                       <button onClick={(e) => handleKick(e, m.userId)} className="text-zinc-600 hover:text-red-500 p-2" title="Remover Membro">
                                           <LogOut className="w-4 h-4" />
                                       </button>
                                   )}
                               </div>
                           </div>
                       ))}
                   </div>
              </div>
          </div>
      )}

      {/* ... rest of the component ... */}
      
      {/* --- ASSIGN CHARACTER MODAL --- */}
      {assigningCharId && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-ordem-panel border border-ordem-purple p-6 max-w-sm w-full relative shadow-[0_0_50px_rgba(124,58,237,0.3)]">
                  <button onClick={() => setAssigningCharId(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X/></button>
                  <h3 className="text-lg font-title font-bold text-white mb-4 flex items-center gap-2"><UserCheck className="text-ordem-purple" /> VINCULAR JOGADOR</h3>
                  <p className="text-zinc-400 text-xs font-mono mb-4">Selecione qual usuário será o DONO desta ficha:</p>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {members.map(m => (
                          <button 
                            key={m.id} 
                            onClick={() => handleAssignPlayer(m.userId)}
                            className="w-full flex items-center justify-between p-3 bg-black/40 border border-zinc-800 hover:border-ordem-purple hover:bg-ordem-purple/10 transition-colors group"
                          >
                              <span className="text-sm font-bold text-white group-hover:text-ordem-purple">{m.username}</span>
                              <span className="text-[10px] text-zinc-500 uppercase">{m.role === 'GM' ? 'Mestre' : 'Jogador'}</span>
                          </button>
                      ))}
                      {members.length === 0 && <p className="text-center text-zinc-500 text-xs italic">Nenhum membro encontrado.</p>}
                  </div>
              </div>
          </div>
      )}

      {/* ... rest of existing modals ... */}
      {showExitModal && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-ordem-panel border border-ordem-blood p-8 max-w-md w-full relative shadow-[0_0_30px_rgba(183,0,44,0.3)]">
            <h3 className="text-xl font-title font-bold text-white mb-4 flex items-center gap-2"><AlertTriangle className="text-ordem-blood" />ALTERAÇÕES NÃO SALVAS</h3>
            <p className="text-zinc-300 font-mono mb-8 leading-relaxed">Existem alterações pendentes na campanha. Sair sem salvar resultará na perda dessas informações.</p>
            <div className="flex flex-col gap-3">
               <Button onClick={handleSaveAllAndExit} variant="primary" isLoading={isSavingAll} className="w-full">SALVAR TUDO E SAIR</Button>
               <Button onClick={handleExitDiscard} variant="danger" className="w-full">SAIR SEM SALVAR</Button>
               <Button onClick={() => setShowExitModal(false)} variant="ghost" className="w-full">CANCELAR</Button>
            </div>
          </div>
        </div>
      )}

      {showInitModal && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-ordem-panel border border-ordem-blood p-6 max-w-md w-full shadow-[0_0_50px_rgba(183,0,44,0.4)] relative">
                  <button onClick={() => setShowInitModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X/></button>
                  <h3 className="text-xl font-title font-black text-ordem-blood mb-6 flex items-center gap-2"><Dices className="w-6 h-6"/> ROLAR INICIATIVA</h3>
                  
                  {isAdminView ? (
                      <div className="space-y-4">
                          <Input label="Nome da Ameaça / NPC" value={monsterForm.name} onChange={e => setMonsterForm({...monsterForm, name: e.target.value})} autoFocus/>
                          <Input label="Valor de Iniciativa Total" type="number" value={monsterForm.initiative} onChange={e => setMonsterForm({...monsterForm, initiative: e.target.value})} placeholder="Ex: 25"/>
                          <Button onClick={handleAddMonster} variant="danger" className="w-full mt-4">ADICIONAR AO COMBATE</Button>
                      </div>
                  ) : (
                      <div className="space-y-6">
                          <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Selecione seu Personagem</label>
                              <select className="w-full bg-black border border-zinc-700 p-2 text-white outline-none" value={initRollCharId} onChange={e => setInitRollCharId(e.target.value)}>
                                  <option value="">Selecione...</option>
                                  {availableCharacters.filter(c => !c.hidden).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                          </div>
                          
                          {initRollCharId && (
                              <div className="grid grid-cols-2 gap-4">
                                  <button onClick={handleAutoInitRoll} className="bg-ordem-blood/20 border border-ordem-blood p-4 hover:bg-ordem-blood/40 transition-colors group">
                                      <Dices className="w-8 h-8 text-ordem-blood mx-auto mb-2 group-hover:scale-110 transition-transform"/>
                                      <span className="block text-xs font-bold text-white uppercase">Automático</span>
                                      <span className="text-[9px] text-zinc-400 block mt-1">Rola d20 + Bônus</span>
                                  </button>
                                  <div className="bg-black border border-zinc-700 p-4">
                                      <span className="block text-xs font-bold text-zinc-400 uppercase mb-2 text-center">Manual</span>
                                      <div className="flex gap-2">
                                          <input type="number" value={manualInitValue} onChange={e => setManualInitValue(e.target.value)} className="w-full bg-zinc-900 text-center text-white border-b border-zinc-500 outline-none" placeholder="Valor"/>
                                          <button onClick={handleManualInit} className="text-ordem-blood font-bold text-xs hover:text-white">OK</button>
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>
      )}

      {sharingDoc && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300">
             <div className="bg-ordem-panel border border-ordem-purple p-6 max-w-lg w-full relative shadow-[0_0_30px_rgba(124,58,237,0.3)] flex flex-col max-h-[90vh]">
                 <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                    <h3 className="text-lg font-title font-bold text-white flex items-center gap-2"><Share2 className="text-ordem-purple w-5 h-5" /> Gerenciar Acesso (Mestre)</h3>
                    <button onClick={() => setSharingDoc(null)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6"/></button>
                 </div>
                 <div className="bg-black/50 p-4 mb-6 border border-zinc-800">
                     <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Nota de {sharingDoc.ownerName}</span>
                     <p className="text-white font-title text-xl">{sharingDoc.name}</p>
                 </div>
                 <div className="flex-grow overflow-y-auto mb-6 custom-scrollbar pr-2">
                     <div className="space-y-4">
                         <div className="flex items-center justify-between p-3 border border-zinc-700 bg-black/20 hover:border-ordem-purple transition-colors">
                             <div className="flex items-center gap-3"><Globe className={`w-5 h-5 ${sharingDoc.isPublic ? 'text-ordem-purple' : 'text-zinc-500'}`} /><div><p className="text-sm font-bold text-white uppercase">Acesso Público</p><p className="text-[10px] text-zinc-500 uppercase">Todos os jogadores podem ver esta nota.</p></div></div>
                             <input type="checkbox" checked={sharingDoc.isPublic} onChange={() => handleUpdateShare('PUBLIC', true)} className="w-5 h-5 accent-ordem-purple"/>
                         </div>
                         <div className="border-t border-zinc-800 my-4"></div>
                         <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">Compartilhar com Agentes Específicos:</p>
                         {availableCharacters.filter(c => c.id !== sharingDoc.characterId && !c.hidden).map(agent => (
                             <label key={agent.id} className="flex items-center justify-between p-2 hover:bg-white/5 cursor-pointer rounded">
                                 <div className="flex items-center gap-3"><User className="w-4 h-4 text-zinc-500" /><span className="text-sm text-zinc-300 font-mono uppercase">{agent.name}</span></div>
                                 <input type="checkbox" checked={sharingDoc.sharedWith?.includes(agent.id)} onChange={() => handleUpdateShare(agent.id, false)} className="w-4 h-4 accent-ordem-purple"/>
                             </label>
                         ))}
                     </div>
                 </div>
                 <Button onClick={() => setSharingDoc(null)} variant="primary" className="w-full">Concluir</Button>
             </div>
          </div>
      )}

      {viewingDoc && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300">
              <button onClick={() => setViewingDoc(null)} className="absolute top-6 right-6 text-white hover:text-ordem-blood transition-colors"><X className="w-10 h-10" /></button>
              <div className="max-w-[90vw] max-h-[90vh] relative"><img src={viewingDoc} alt="Document Fullscreen" className="max-w-full max-h-[90vh] object-contain border-2 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,1)]" /></div>
          </div>
      )}

      {/* Header */}
      <header className="mb-8 border-b border-ordem-border pb-6">
        
        <div className="flex justify-between items-start mb-4">
            <Button variant="ghost" onClick={handleBackClick} className="text-zinc-500 hover:text-white px-0"><ArrowLeft className="mr-2 h-4 w-4"/> Voltar</Button>
            <div className="flex gap-2 relative z-20 items-center">
                {isAdminView ? (
                   <div className="flex items-center gap-4">
                       <Button 
                            onClick={toggleCombat} 
                            className={`flex items-center gap-2 font-bold border ${localCampaign.isCombatActive ? 'bg-ordem-blood text-white border-ordem-blood animate-pulse' : 'bg-transparent text-zinc-500 border-zinc-700 hover:text-white'}`}
                       >
                           {localCampaign.isCombatActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                           {localCampaign.isCombatActive ? 'ENCERRAR COMBATE' : 'INICIAR COMBATE'}
                       </Button>

                       {!isEditing && (
                           <>
                                {deleteStep > 0 ? (
                                     <div className="flex items-center gap-2 bg-ordem-blood/10 p-2 border border-ordem-blood animate-pulse rounded">
                                       <button className="text-ordem-blood font-bold text-xs hover:text-white uppercase transition-colors" onClick={handleCampaignDelete}>Confirmar Exclusão</button>
                                       <button className="text-zinc-500 text-xs uppercase hover:text-white transition-colors border-l border-zinc-700 pl-2" onClick={cancelDelete}>Cancelar</button>
                                     </div>
                                ) : (
                                    isOwner && <Button variant="danger" onClick={handleCampaignDelete} title="Excluir Campanha Permanentemente"><Trash2 className="w-4 h-4" /></Button>
                                )}
                           </>
                       )}
                       {isEditing ? (
                           <div className="flex gap-2"><Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button><Button variant="primary" onClick={handleSave}>Salvar Alterações</Button></div>
                       ) : (
                           <>
                                <Button variant="secondary" onClick={handleOpenMembers} className="flex items-center gap-2"><Users className="w-4 h-4"/> Membros</Button>
                                <Button variant="secondary" onClick={() => setIsEditing(true)} disabled={deleteStep > 0}><Settings className="w-4 h-4 mr-2"/> Editar Campanha</Button>
                           </>
                       )}
                       <div className="bg-ordem-blood/20 px-3 py-1 border border-ordem-blood flex items-center gap-2 text-ordem-blood text-xs font-bold uppercase tracking-widest ml-2"><Shield className="w-3 h-3" /> Acesso Mestre</div>
                   </div>
                ) : (
                   <div className="bg-ordem-green/20 px-3 py-1 border border-ordem-green flex items-center gap-2 text-ordem-green text-xs font-bold uppercase tracking-widest ml-2"><Unlock className="w-3 h-3" /> Acesso Agente</div>
                )}
            </div>
        </div>

        {isEditing ? (
            <div className="space-y-4 max-w-2xl">
                <Input label="Nome da Missão" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} />
                <Input label="Resumo" value={editData.summary || ''} onChange={e => setEditData({...editData, summary: e.target.value})} />
            </div>
        ) : (
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl md:text-5xl font-title font-black text-white uppercase tracking-wide">{localCampaign.name}</h1>
                </div>
                <div className="flex flex-col gap-1 mb-2">
                     <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-0.5 rounded tracking-widest uppercase w-fit">
                         Admin: {localCampaign.adminName}
                     </span>
                     {localCampaign.gmId && (
                         <span className="bg-ordem-blood/20 text-ordem-blood text-[10px] font-bold px-2 py-0.5 rounded tracking-widest uppercase w-fit border border-ordem-blood/20">
                             Mestre (GM)
                         </span>
                     )}
                </div>
                <p className="text-zinc-400 font-mono text-lg max-w-3xl">{localCampaign.summary}</p>
            </div>
        )}
      </header>

      {/* COMBAT BAR */}
      {localCampaign.isCombatActive && renderCombatBar()}

      {/* Navigation */}
      <div className="flex gap-1 mb-8 border-b border-ordem-border/50 overflow-x-auto">
        <button type="button" onClick={() => setActiveTab('agents')} className={`flex items-center gap-2 px-6 py-3 font-title text-sm uppercase font-bold tracking-widest transition-all clip-path-slant-top whitespace-nowrap ${activeTab === 'agents' ? 'bg-white text-black border-t-2 border-ordem-purple' : 'text-zinc-500 hover:text-white'}`}><Users className="w-4 h-4" /> Agentes</button>
        <button type="button" onClick={() => setActiveTab('manual')} className={`flex items-center gap-2 px-6 py-3 font-title text-sm uppercase font-bold tracking-widest transition-all clip-path-slant-top whitespace-nowrap ${activeTab === 'manual' ? 'bg-white text-black border-t-2 border-ordem-purple' : 'text-zinc-500 hover:text-white'}`}><BookOpen className="w-4 h-4" /> Protocolos</button>
        <button type="button" onClick={() => setActiveTab('evidences')} className={`flex items-center gap-2 px-6 py-3 font-title text-sm uppercase font-bold tracking-widest transition-all clip-path-slant-top whitespace-nowrap ${activeTab === 'evidences' ? 'bg-white text-black border-t-2 border-ordem-purple' : 'text-zinc-500 hover:text-white'}`}><FileText className="w-4 h-4" /> Evidências</button>
        <button type="button" onClick={() => setActiveTab('map')} className={`flex items-center gap-2 px-6 py-3 font-title text-sm uppercase font-bold tracking-widest transition-all clip-path-slant-top whitespace-nowrap ${activeTab === 'map' ? 'bg-white text-black border-t-2 border-ordem-purple' : 'text-zinc-500 hover:text-white'}`}><MapIcon className="w-4 h-4" /> Mapa</button>
        {isAdminView && (
           <>
              <button type="button" onClick={() => setActiveTab('dm_screen')} className={`flex items-center gap-2 px-6 py-3 font-title text-sm uppercase font-bold tracking-widest transition-all clip-path-slant-top whitespace-nowrap ${activeTab === 'dm_screen' ? 'bg-ordem-green/20 text-ordem-green border-t-2 border-ordem-green' : 'text-zinc-600 hover:text-ordem-green hover:bg-ordem-green/5'}`}><LayoutDashboard className="w-4 h-4" /> Escudo</button>
               <button type="button" onClick={() => setActiveTab('gm_notes')} className={`flex items-center gap-2 px-6 py-3 font-title text-sm uppercase font-bold tracking-widest transition-all clip-path-slant-top whitespace-nowrap ${activeTab === 'gm_notes' ? 'bg-ordem-blood/20 text-ordem-blood border-t-2 border-ordem-blood' : 'text-zinc-600 hover:text-ordem-blood hover:bg-ordem-blood/5'}`}><FileLock2 className="w-4 h-4" /> Notas</button>
             <button type="button" onClick={() => setActiveTab('master_archives')} className={`flex items-center gap-2 px-6 py-3 font-title text-sm uppercase font-bold tracking-widest transition-all clip-path-slant-top whitespace-nowrap ${activeTab === 'master_archives' ? 'bg-yellow-900/20 text-yellow-500 border-t-2 border-yellow-500' : 'text-zinc-600 hover:text-yellow-500 hover:bg-yellow-500/5'}`}><FolderOpen className="w-4 h-4" /> Arquivos</button>
           </>
        )}
      </div>

      {/* Content */}
      <main>
        {/* AGENTS */}
        {activeTab === 'agents' && (
            <div>
                <div className="flex justify-end mb-6"><Button onClick={onCreateCharacter} className="flex items-center gap-2"><Plus className="w-4 h-4" /> Recrutar Novo Agente</Button></div>
                {displayedCharacters.length === 0 ? <div className="text-center py-20 border border-dashed border-zinc-800 rounded bg-black/20"><p className="text-zinc-600 font-mono uppercase tracking-widest mb-4">Nenhum agente recrutado para esta missão.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{displayedCharacters.map(char => (
                    <CharacterCard 
                        key={char.id} 
                        data={char} 
                        onClick={() => onSelectCharacter(char)} 
                        isFavorite={favorites.includes(char.id)} 
                        onToggleFavorite={() => toggleFavorite(char.id)}
                        isAdmin={isAdminView}
                        onToggleHidden={() => toggleCharacterHidden(char.id, !!char.hidden)}
                        onAssignPlayer={isAdminView ? () => handleOpenAssign(char.id) : undefined}
                    />
                ))}</div>}
            </div>
        )}

        {/* ... Rest of existing tabs ... */}
        {/* MAP TAB */}
        {activeTab === 'map' && (
            <MapView 
                campaign={localCampaign} 
                characters={availableCharacters}
                isAdmin={isAdminView}
            />
        )}

        {/* EVIDENCES */}
        {activeTab === 'evidences' && (
            <div className="space-y-8">
                {/* 1. PUBLIC EVIDENCE LIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{publicArchives.map((doc, idx) => (<div key={doc.id} className="bg-ordem-panel border border-zinc-800 p-6 hover:border-ordem-purple transition-all group cursor-pointer" onClick={() => doc.link ? setViewingDoc(doc.link) : null}><div className="flex justify-between items-start mb-4"><span className="text-[10px] bg-ordem-purple/20 text-ordem-purple font-bold px-2 py-1 uppercase tracking-widest border border-ordem-purple/30">Evidência Pública</span>{doc.link && <Eye className="w-4 h-4 text-zinc-500 group-hover:text-white" />}</div><h3 className="text-xl font-title font-bold text-white mb-2">{doc.name}</h3><p className="text-zinc-400 font-mono text-sm mb-4 line-clamp-3">{doc.description}</p><div className="flex gap-4 text-xs font-mono text-zinc-600 border-t border-white/5 pt-3"><div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {doc.location || '???'}</div><div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {doc.date || '???'}</div></div></div>))}{publicArchives.length === 0 && <div className="col-span-full text-center py-20 border border-dashed border-zinc-800 rounded bg-black/20"><FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" /><p className="text-zinc-600 font-mono uppercase tracking-widest">Nenhuma evidência pública no banco de dados.</p></div>}</div>
                
                {/* 2. ADMIN ONLY: PLAYER DOCUMENTS */}
                {isAdminView && (
                    <div className="border-t border-ordem-border pt-8 mt-12">
                        <div className="flex items-center gap-3 mb-6">
                            <EyeOff className="text-zinc-400 w-6 h-6" />
                            <h3 className="text-lg font-title font-bold text-zinc-300 uppercase tracking-widest">Monitoramento de Notas (Acesso Mestre)</h3>
                        </div>
                        
                        {playerDocs.length === 0 ? (
                            <div className="text-zinc-600 font-mono text-sm italic border border-dashed border-zinc-800 p-4 text-center">Nenhuma nota pessoal encontrada nos agentes.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {playerDocs.map(doc => (
                                    <div key={doc.id} className="bg-black/30 border border-zinc-800 p-5 relative group hover:border-zinc-600 transition-colors">
                                        <div className="absolute top-2 right-2 flex gap-1">
                                             <button onClick={() => handleDeletePlayerDoc(doc)} className="text-zinc-600 hover:text-red-500 p-1" title="Excluir Nota Permanentemente"><Trash2 className="w-3 h-3"/></button>
                                        </div>
                                        <div className="flex justify-between items-start mb-2 pr-6">
                                            <div>
                                                <h4 className="text-white font-bold">{doc.name}</h4>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <User className="w-3 h-3 text-zinc-500"/>
                                                    <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Autor: {doc.ownerName}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {doc.link && <button onClick={() => setViewingDoc(doc.link)} className="text-zinc-500 hover:text-white p-1"><Eye className="w-4 h-4"/></button>}
                                            </div>
                                        </div>
                                        <p className="text-zinc-500 text-xs line-clamp-3 mb-3 font-mono">{doc.description}</p>
                                        
                                        <div className="border-t border-zinc-800 pt-3 flex justify-between items-center">
                                            <div className="text-[9px] text-zinc-600 uppercase max-w-[60%] truncate">
                                                {doc.isPublic ? <span className="text-ordem-purple font-bold">PÚBLICO</span> : (
                                                    doc.sharedWith && doc.sharedWith.length > 0 ? 
                                                    `Compartilhado: ${doc.sharedWith.map(id => availableCharacters.find(c => c.id === id)?.name || '?').join(', ')}` 
                                                    : 'PRIVADO'
                                                )}
                                            </div>
                                            <Button onClick={() => setSharingDoc(doc)} variant="secondary" className="px-2 py-1 h-auto text-[10px]">
                                                <Share2 className="w-3 h-3 mr-1" /> Permissões
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* ... Rest of existing tabs ... */}
        {activeTab === 'master_archives' && isAdminView && (
            <div className="space-y-8">
                <div className="flex justify-between items-center bg-yellow-900/10 p-4 border-l-4 border-yellow-500"><span className="text-yellow-500 font-mono uppercase tracking-widest text-sm">Central de Documentos & Distribuição</span><div className="flex gap-2"><Button onClick={addArchive} variant="secondary" className="text-xs"><Plus className="w-4 h-4 mr-2" /> Criar Arquivo</Button><Button onClick={handleSaveArchives} variant="primary" className="text-xs"><Save className="w-4 h-4 mr-2" /> Salvar Distribuição</Button></div></div>
                <div className="space-y-6">{archives.map((archive, idx) => (<div key={archive.id} className="bg-ordem-panel border border-zinc-800 p-6 flex flex-col md:flex-row gap-6 relative group"><div className="flex-grow space-y-4"><div className="flex items-center justify-between"><Input value={archive.name} onChange={e => updateArchive(idx, 'name', e.target.value)} className="font-title text-xl font-bold bg-transparent border-none p-0 focus:shadow-none placeholder:text-zinc-700 w-full" placeholder="NOME DO ARQUIVO" /><div className="flex items-center gap-2">{deletingArchiveIndex === idx ? (<div className="flex items-center gap-2 animate-in fade-in duration-200"><button onClick={() => confirmRemoveArchive(idx)} className="text-[10px] text-ordem-blood font-bold hover:text-white px-2 py-1 bg-ordem-blood/10 hover:bg-ordem-blood uppercase tracking-wider transition-colors">CONFIRMAR?</button><button onClick={() => setDeletingArchiveIndex(null)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button></div>) : (<button onClick={() => setDeletingArchiveIndex(idx)} className="text-zinc-700 hover:text-ordem-blood"><Trash2 className="w-5 h-5"/></button>)}</div></div><div className="grid grid-cols-2 gap-4"><Input value={archive.location} onChange={e => updateArchive(idx, 'location', e.target.value)} placeholder="Local..." className="text-xs bg-transparent"/><Input value={archive.date} onChange={e => updateArchive(idx, 'date', e.target.value)} placeholder="Data..." className="text-xs bg-transparent"/></div><TextArea value={archive.description} onChange={e => updateArchive(idx, 'description', e.target.value)} className="bg-black/30 min-h-[60px]" placeholder="Conteúdo..."/><Input value={archive.link} onChange={e => updateArchive(idx, 'link', e.target.value)} placeholder="URL da Imagem/Doc..." className="text-xs text-ordem-purple bg-black/20"/></div><div className="w-full md:w-64 border-l border-zinc-800 pl-6 flex flex-col"><span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2"><FolderOpen className="w-3 h-3" /> Inventário dos Agentes</span><div className="space-y-2 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">{availableCharacters.map(char => { const hasItem = archive.holders.includes(char.id); return (<label key={char.id} className="flex items-center gap-2 cursor-pointer group/item hover:bg-white/5 p-1 rounded"><div className={`w-4 h-4 border flex items-center justify-center transition-colors ${hasItem ? 'bg-ordem-green border-ordem-green' : 'border-zinc-700'}`}>{hasItem && <Check className="w-3 h-3 text-black" />}</div><input type="checkbox" className="hidden" checked={hasItem} onChange={() => toggleArchiveHolder(idx, char.id)} /><span className={`text-xs font-mono uppercase ${hasItem ? 'text-white' : 'text-zinc-500'}`}>{char.name}</span></label>)})}</div></div></div>))}{archives.length === 0 && <div className="text-center py-16 opacity-50 border border-dashed border-zinc-800">Nenhum arquivo mestre criado.</div>}</div>
            </div>
        )}

        {/* MANUAL TAB */}
        {activeTab === 'manual' && (
            <div className="bg-ordem-panel p-8 border border-ordem-border min-h-[500px] relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><BookOpen className="w-32 h-32 text-white" /></div>
                {isEditing && isAdminView ? (
                  <div className="space-y-8">{editData.manual.map((block, idx) => (<div key={block.id} className="bg-black/30 border border-zinc-800 p-6 relative group"><div className="flex items-start gap-4 mb-4"><Input value={block.title} onChange={e => updateBlock(idx, 'title', e.target.value)} className="font-title text-xl font-bold bg-transparent border-none p-0 w-full focus:shadow-none text-ordem-purple" wrapperClassName="flex-1" placeholder="Título da Seção" /><Button variant="danger" onClick={() => removeBlock(idx)} className="px-3 shrink-0 relative z-20" type="button"><Trash2 className="w-4 h-4" /></Button></div><TextArea value={block.content} onChange={e => updateBlock(idx, 'content', e.target.value)} className="min-h-[150px] bg-black/50" placeholder="Conteúdo do protocolo..."/></div>))}<Button variant="secondary" onClick={addBlock} className="w-full border-dashed py-4 flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Adicionar Bloco de Regras</Button></div>
                ) : (
                  <div className="space-y-12">{(Array.isArray(localCampaign.manual) ? localCampaign.manual : [{id:'def',title:'Regras', content: String(localCampaign.manual || '')}]).map(block => (<article key={block.id} className="relative"><div className="absolute -left-8 top-0 bottom-0 w-[1px] bg-gradient-to-b from-ordem-purple via-transparent to-transparent opacity-50"></div><h3 className="text-2xl font-title font-bold text-ordem-purple uppercase mb-4 flex items-center gap-3"><span className="w-2 h-2 bg-ordem-purple rotate-45"></span>{block.title}</h3><div className="prose prose-invert prose-p:font-mono prose-p:text-zinc-300 prose-p:leading-relaxed max-w-none whitespace-pre-wrap">{block.content}</div></article>))}{(!localCampaign.manual || (Array.isArray(localCampaign.manual) && localCampaign.manual.length === 0)) && <p className="text-zinc-500 font-mono italic">Nenhum protocolo registrado pelo administrador.</p>}</div>
                )}
            </div>
        )}

        {/* DM SCREEN (ADMIN ONLY) */}
        {activeTab === 'dm_screen' && isAdminView && (
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-black/50 p-4 border-l-4 border-ordem-green">
                    <span className="text-ordem-green font-mono uppercase tracking-widest text-sm">Painel Modular do Mestre</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={addScreenNote} className="text-xs"><Plus className="w-4 h-4 mr-2" /> Adicionar Bloco</Button>
                        <Button variant="primary" onClick={handleSaveScreen} isLoading={isSavingScreen} className="text-xs"><Save className="w-4 h-4 mr-2" /> Salvar Escudo</Button>
                    </div>
                </div>
                
                <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-4 auto-rows-[20px] dense pb-40">
                    {dmScreen.map((note, idx) => (
                        <div 
                            key={note.id} 
                            onDragStart={() => handleDragStart(idx)}
                            onDragEnter={() => handleDragEnter(idx)}
                            onDragEnd={handleDragEnd}
                            draggable
                            style={{
                                gridColumn: `span ${note.colSpan || 4}`,
                                gridRow: `span ${note.rowSpan || 12}`,
                                opacity: draggedItemIndex === idx ? 0.5 : 1
                            }}
                            className={`
                                relative flex flex-col p-4 shadow-lg transition-shadow hover:shadow-2xl group
                                bg-ordem-panel border-t-4
                                ${note.color === 'purple' ? 'border-ordem-purple' : note.color === 'green' ? 'border-ordem-green' : note.color === 'blood' ? 'border-ordem-blood' : note.color === 'yellow' ? 'border-yellow-500' : 'border-zinc-500'}
                            `}
                        >
                            <div className="absolute top-0 left-0 right-0 h-4 cursor-move active:cursor-grabbing hover:bg-white/5 z-10 flex items-center justify-center">
                                <GripVertical className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100" />
                            </div>

                            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2 min-h-[32px] mt-2 relative z-20">
                                <input value={note.title} onChange={e => updateScreenNote(idx, 'title', e.target.value)} className="bg-transparent text-white font-title font-bold text-lg outline-none w-full placeholder:text-zinc-600" placeholder="TÍTULO" />
                                <div className="flex items-center gap-1 ml-2">
                                    {deletingNoteIndex === idx ? (
                                        <div className="flex items-center gap-2 bg-black/90 absolute top-2 right-2 p-1 border border-ordem-blood rounded z-30 animate-in fade-in zoom-in duration-200">
                                            <button onClick={() => removeScreenNote(idx)} className="text-[10px] text-ordem-blood font-bold hover:text-white px-2 py-1 bg-ordem-blood/10 hover:bg-ordem-blood uppercase tracking-wider transition-colors" type="button">CONFIRMAR?</button>
                                            <button onClick={() => setDeletingNoteIndex(null)} className="text-zinc-500 hover:text-white px-1" type="button"><X className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setDeletingNoteIndex(idx)} className="hover:text-ordem-blood ml-2 opacity-0 group-hover:opacity-100 transition-opacity" type="button"><Trash2 className="w-4 h-4"/></button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex gap-1 mb-3 opacity-0 group-hover:opacity-100 transition-opacity justify-end relative z-20">
                                {['gray', 'purple', 'green', 'blood', 'yellow'].map(c => (
                                    <button key={c} onClick={() => updateScreenNote(idx, 'color', c)} className={`w-3 h-3 rounded-full border border-black ${c === 'purple' ? 'bg-ordem-purple' : c === 'green' ? 'bg-ordem-green' : c === 'blood' ? 'bg-ordem-blood' : c === 'yellow' ? 'bg-yellow-500' : 'bg-zinc-500'} ${note.color === c ? 'ring-1 ring-white' : ''}`} type="button" />
                                ))}
                            </div>
                            
                            <div className="flex-grow relative overflow-hidden">
                                <SmartNoteEditor 
                                    initialContent={note.content} 
                                    onChange={(val) => updateScreenNote(idx, 'content', val)}
                                    characters={availableCharacters}
                                    onOpenSheet={onAdminOpenSheet}
                                />
                            </div>
                        
                            <div 
                                onMouseDown={(e) => startResize(e, idx)}
                                className="absolute bottom-1 right-1 p-1 cursor-nwse-resize text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-30 bg-black/50 rounded-tl"
                            >
                                <ArrowDownRight className="w-4 h-4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* GM NOTES (ADMIN ONLY) */}
        {activeTab === 'gm_notes' && isAdminView && (
            <div className="bg-black/80 p-8 border border-ordem-blood/30 min-h-[500px] relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none"></div><div className="absolute top-0 right-0 w-64 h-64 bg-ordem-blood/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex justify-between items-center mb-6 border-b border-ordem-blood/20 pb-4 relative z-10"><h3 className="text-2xl font-title font-black text-ordem-blood uppercase tracking-widest flex items-center gap-3"><FileLock2 className="w-6 h-6" /> Notas do Mestre</h3><Button variant="danger" onClick={handleSaveNotes} isLoading={isSavingNotes} className="flex gap-2"><Save className="w-4 h-4" /> Salvar Notas</Button></div>
                
                {/* Content Area */}
                <div className="relative z-10 h-full flex-grow bg-black/50 border border-zinc-800">
                     <SmartNoteEditor 
                        initialContent={gmNotes} 
                        onChange={(val) => setGmNotes(val)}
                        characters={availableCharacters}
                        onOpenSheet={onAdminOpenSheet}
                    />
                </div>
                
                <p className="text-xs text-ordem-blood/50 font-mono mt-2 text-right">DADOS CRIPTOGRAFADOS. ACESSO RESTRITO AO ADMINISTRADOR.</p>
            </div>
        )}
      </main>
    </div>
  );
};