


import React, { useState, useEffect, useRef } from 'react';
import { Campaign, CharacterSummary, MapToken, MapConfig, Character, MapFogShape, MapScene, AttributeName } from '../types';
import { dbService } from '../services/dbService';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Lock, Map as MapIcon, Plus, Eye, EyeOff, Save, Move, Skull, User, X, Check, ShieldAlert, Settings, Minus, Trash2, ArrowLeftRight, Layers, ImageOff, Maximize, Minimize, Dices, CloudFog, FolderOpen, ArrowDownRight, FolderPlus } from 'lucide-react';
import { verifyPassword } from '../services/cryptoService';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Props {
  campaign: Campaign;
  characters: CharacterSummary[];
  isAdmin: boolean;
  currentIdentity?: string;
}

const ATTRIBUTES = ['AGI', 'FOR', 'INT', 'PRE', 'VIG'];

export const MapView: React.FC<Props> = ({ campaign, characters, isAdmin, currentIdentity }) => {
  // Initialize with safe defaults
  const [mapConfig, setMapConfig] = useState<MapConfig>({
      imageUrl: '',
      tokens: [],
      fogShapes: [],
      allowedPlayers: [],
      ...(campaign.mapConfig || {})
  });
  
  // Local state for dragging (immediate feedback)
  const [tokens, setTokens] = useState<MapToken[]>(mapConfig.tokens || []);
  const [fogShapes, setFogShapes] = useState<MapFogShape[]>(mapConfig.fogShapes || []);
  
  // Identity State (For non-admins to "login" to map)
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);
  const [identityPassword, setIdentityPassword] = useState('');
  const [identityError, setIdentityError] = useState('');
  const [isIdentityVerified, setIsIdentityVerified] = useState(false);

  // Self Data (Fallback if user is hidden in main list)
  const [selfData, setSelfData] = useState<Character | null>(null);

  // Admin Tools State
  const [showTools, setShowTools] = useState(true);
  const [newMonster, setNewMonster] = useState({ name: '', url: '', visible: false }); 
  const [mapUrlInput, setMapUrlInput] = useState(mapConfig.imageUrl);
  
  // Scenes State
  const [scenes, setScenes] = useState<MapScene[]>([]);
  const [newSceneName, setNewSceneName] = useState('');
  const [showSceneTools, setShowSceneTools] = useState(false);

  // View State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dragging State
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  
  // Fog Resizing State
  const [resizingFogId, setResizingFogId] = useState<string | null>(null);
  const [draggingFogId, setDraggingFogId] = useState<string | null>(null);
  const [startDragPos, setStartDragPos] = useState({ x: 0, y: 0 });

  const mapRef = useRef<HTMLDivElement>(null);

  // Broadcast Channel
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastBroadcastTime = useRef<number>(0);

  // Dice Roller State
  const [diceConfig, setDiceConfig] = useState({
      attribute: 'AGI', // 'AGI' | 'FOR' ... | 'MANUAL'
      manualQty: 2,
      skillName: '',
      bonus: 0
  });
  const [mapRollResult, setMapRollResult] = useState<{
      total: number;
      rolls: number[];
      bonus: number;
      label: string;
      discarded?: boolean;
  } | null>(null);

  // 1. Fetch Self Data if needed
  useEffect(() => {
    if (currentIdentity) {
        const isInList = characters.find(c => c.id === currentIdentity);
        if (!isInList) {
            dbService.getCharacterById(currentIdentity).then(data => {
                if (data) setSelfData(data);
            });
        }
    }
  }, [currentIdentity, characters]);

  // Load Scenes (GM Only)
  useEffect(() => {
      if (isAdmin) {
          dbService.listMapScenes(campaign.id).then(setScenes);
      }
  }, [campaign.id, isAdmin]);

  // Helper to resolve Character Data
  const getCharData = (id: string): CharacterSummary | Character | undefined | null => {
      const publicChar = characters.find(c => c.id === id);
      if (publicChar) return publicChar;
      if (selfData && selfData.id === id) return selfData;
      return null;
  };

  // 2. Join Broadcast Channel
  useEffect(() => {
      channelRef.current = dbService.joinMapRoom(campaign.id, (payload: { id: string, x: number, y: number, flip?: boolean, rotation?: number, variant?: number, visible?: boolean }) => {
          setTokens(prev => prev.map(t => {
              if (t.id === payload.id) {
                  // Ignore remote updates for the token I am currently dragging
                  if (draggingTokenId === t.id) return t;

                  return { 
                      ...t, 
                      x: payload.x, 
                      y: payload.y, 
                      flip: payload.flip, 
                      rotation: payload.rotation,
                      variant: payload.variant as 1|2|3,
                      visible: payload.visible !== undefined ? payload.visible : t.visible
                  };
              }
              return t;
          }));
      });

      return () => {
          if (channelRef.current) {
              dbService.leaveMapRoom(channelRef.current);
          }
      };
  }, [campaign.id, draggingTokenId]);

  // 3. Sync with DB Changes
  useEffect(() => {
      const config = campaign.mapConfig || { imageUrl: '', tokens: [], allowedPlayers: [], fogShapes: [] };
      setMapConfig(config);
      
      setFogShapes(config.fogShapes || []);

      setTokens(prev => {
          const incomingTokens = config.tokens || [];
          return incomingTokens.map(inc => {
               if (draggingTokenId === inc.id) {
                   const currentLocal = prev.find(p => p.id === inc.id);
                   return currentLocal || inc; 
               }
               return inc;
          });
      });
      
      if (document.activeElement?.tagName !== 'INPUT') {
          setMapUrlInput(config.imageUrl || '');
      }

  }, [campaign.mapConfig, draggingTokenId]);

  // 4. Native Wheel & Keyboard
  useEffect(() => {
      const mapEl = mapRef.current;
      if (!mapEl) return;

      const handleNativeWheel = (e: WheelEvent) => {
          if (draggingTokenId) {
              e.preventDefault();
              setTokens(prev => prev.map(t => {
                 if (t.id === draggingTokenId) {
                    const currentRot = t.rotation || 0;
                    const newRot = currentRot + (e.deltaY > 0 ? 15 : -15);
                    return { ...t, rotation: newRot };
                 }
                 return t;
              }));
          }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
          if (draggingTokenId && ['1','2','3'].includes(e.key)) {
              const variant = parseInt(e.key) as 1|2|3;
              setTokenVariant(draggingTokenId, variant);
          }
      }

      mapEl.addEventListener('wheel', handleNativeWheel, { passive: false });
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
          mapEl.removeEventListener('wheel', handleNativeWheel);
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [draggingTokenId]);

  // Auto-login
  useEffect(() => {
    if (currentIdentity) {
        setSelectedIdentity(currentIdentity);
        setIsIdentityVerified(true);
        if (!selfData) {
            dbService.getCharacterById(currentIdentity).then(d => d && setSelfData(d));
        }
    }
  }, [currentIdentity]);

  // --- ACTIONS ---

  const handleIdentityLogin = async () => {
      if (!selectedIdentity) return;
      const char = await dbService.getCharacterById(selectedIdentity);
      if (char && await verifyPassword(identityPassword, char.passwordHash)) {
          setIsIdentityVerified(true);
          setIdentityError('');
          setSelfData(char);
      } else {
          setIdentityError('Senha incorreta.');
      }
  };

  const updateCampaign = async (newConfig: MapConfig) => {
      await dbService.updateCampaign({ ...campaign, mapConfig: newConfig });
  };

  const handleMouseDown = (e: React.MouseEvent, tokenId: string) => {
      if (!isAdmin && tokenId !== selectedIdentity) return;
      e.preventDefault();
      e.stopPropagation();
      setDraggingTokenId(tokenId);
  };

  const handleFogMouseDown = (e: React.MouseEvent, fogId: string) => {
      if (!isAdmin) return;
      e.preventDefault();
      e.stopPropagation();
      setDraggingFogId(fogId);
      setStartDragPos({ x: e.clientX, y: e.clientY });
  };

  const handleFogResizeDown = (e: React.MouseEvent, fogId: string) => {
      if (!isAdmin) return;
      e.preventDefault();
      e.stopPropagation();
      setResizingFogId(fogId);
      setStartDragPos({ x: e.clientX, y: e.clientY });
  }

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      
      // Token Dragging
      if (draggingTokenId) {
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          const clampedX = Math.max(0, Math.min(100, x));
          const clampedY = Math.max(0, Math.min(100, y));

          const currentToken = tokens.find(t => t.id === draggingTokenId);

          setTokens(prev => prev.map(t => 
              t.id === draggingTokenId ? { ...t, x: clampedX, y: clampedY } : t
          ));

          const now = Date.now();
          if (now - lastBroadcastTime.current > 40 && channelRef.current) {
              dbService.sendTokenMove(channelRef.current, { 
                  id: draggingTokenId, 
                  x: clampedX, 
                  y: clampedY,
                  flip: currentToken?.flip,
                  rotation: currentToken?.rotation,
                  variant: currentToken?.variant,
                  visible: currentToken?.visible
              });
              lastBroadcastTime.current = now;
          }
      }

      // Fog Dragging
      if (draggingFogId) {
          const deltaXPct = ((e.clientX - startDragPos.x) / rect.width) * 100;
          const deltaYPct = ((e.clientY - startDragPos.y) / rect.height) * 100;
          
          setFogShapes(prev => prev.map(f => {
              if (f.id === draggingFogId) {
                  return { ...f, x: f.x + deltaXPct, y: f.y + deltaYPct };
              }
              return f;
          }));
          setStartDragPos({ x: e.clientX, y: e.clientY });
      }

      // Fog Resizing
      if (resizingFogId) {
           const deltaXPct = ((e.clientX - startDragPos.x) / rect.width) * 100;
           const deltaYPct = ((e.clientY - startDragPos.y) / rect.height) * 100;

           setFogShapes(prev => prev.map(f => {
               if (f.id === resizingFogId) {
                   return { 
                       ...f, 
                       width: Math.max(2, f.width + deltaXPct), 
                       height: Math.max(2, f.height + deltaYPct) 
                   };
               }
               return f;
           }));
           setStartDragPos({ x: e.clientX, y: e.clientY });
      }
  };

  const handleMouseUp = async () => {
      if (draggingTokenId) {
          const updatedConfig = { ...mapConfig, tokens: tokens };
          await updateCampaign(updatedConfig);
          setDraggingTokenId(null);
      }
      if (draggingFogId || resizingFogId) {
          const updatedConfig = { ...mapConfig, fogShapes: fogShapes };
          await updateCampaign(updatedConfig);
          setDraggingFogId(null);
          setResizingFogId(null);
      }
  };

  const handleContextMenu = async (e: React.MouseEvent) => {
      if (draggingTokenId) {
          e.preventDefault(); 
          e.stopPropagation();
          const token = tokens.find(t => t.id === draggingTokenId);
          if (token) {
             toggleTokenFlip(token.id);
          }
      }
  };

  const updateTokenSize = async (tokenId: string, delta: number) => {
      const newTokens = tokens.map(t => t.id === tokenId ? { ...t, size: Math.max(0.3, (t.size || 1) + delta) } : t);
      setTokens(newTokens);
      await updateCampaign({ ...mapConfig, tokens: newTokens });
  };

  const toggleTokenFlip = async (tokenId: string) => {
      const newTokens = tokens.map(t => t.id === tokenId ? { ...t, flip: !t.flip } : t);
      setTokens(newTokens);
      await updateCampaign({ ...mapConfig, tokens: newTokens });
  };

  const setTokenVariant = async (tokenId: string, variant: 1 | 2 | 3) => {
      const newTokens = tokens.map(t => t.id === tokenId ? { ...t, variant: variant } : t);
      setTokens(newTokens);
      await updateCampaign({ ...mapConfig, tokens: newTokens });
  }

  const toggleTokenVisibility = async (tokenId: string) => {
      const newTokens = tokens.map(t => {
          if (t.id === tokenId) {
              const currentVis = t.visible !== undefined ? t.visible : true;
              return { ...t, visible: !currentVis };
          }
          return t;
      });
      setTokens(newTokens);
      await updateCampaign({ ...mapConfig, tokens: newTokens });
  };

  const saveMapUrl = async () => {
      await updateCampaign({ ...mapConfig, imageUrl: mapUrlInput });
  };

  const togglePermission = async (charId: string) => {
      const current = mapConfig.allowedPlayers || [];
      const updated = current.includes(charId) ? current.filter(id => id !== charId) : [...current, charId];
      await updateCampaign({ ...mapConfig, allowedPlayers: updated });
  };

  const addTokenToMap = async (charId: string, type: 'PLAYER' | 'MONSTER', name: string, url: string, initialVisible: boolean = true) => {
      if (tokens.find(t => t.id === charId)) return;
      const newToken: MapToken = {
          id: charId,
          type,
          label: name,
          imageUrl: url,
          x: 50, y: 50, size: 1.0, rotation: 0, flip: false, variant: 1, visible: initialVisible
      };
      const newTokens = [...tokens, newToken];
      setTokens(newTokens);
      await updateCampaign({ ...mapConfig, tokens: newTokens });
  };

  const removeTokenFromMap = async (tokenId: string) => {
      const newTokens = tokens.filter(t => t.id !== tokenId);
      setTokens(newTokens);
      await updateCampaign({ ...mapConfig, tokens: newTokens });
  };

  const createMonster = async () => {
      if (!newMonster.name) return;
      const id = `monster_${Date.now()}`;
      await addTokenToMap(id, 'MONSTER', newMonster.name, newMonster.url || '', newMonster.visible);
      setNewMonster({ name: '', url: '', visible: false });
  };

  // --- FOG FUNCTIONS ---
  const addFogShape = async () => {
      const newFog: MapFogShape = {
          id: crypto.randomUUID(),
          x: 40, y: 40, width: 20, height: 20
      };
      const newFogList = [...fogShapes, newFog];
      setFogShapes(newFogList);
      await updateCampaign({ ...mapConfig, fogShapes: newFogList });
  };

  const removeFogShape = async (id: string) => {
      const newFogList = fogShapes.filter(f => f.id !== id);
      setFogShapes(newFogList);
      await updateCampaign({ ...mapConfig, fogShapes: newFogList });
  }

  // --- PRESET SCENES FUNCTIONS ---
  const saveScene = async () => {
      if (!newSceneName.trim()) return;
      // Capture CURRENT state including fog and tokens
      const currentConfig: MapConfig = {
          imageUrl: mapUrlInput,
          tokens: tokens,
          fogShapes: fogShapes,
          allowedPlayers: mapConfig.allowedPlayers,
          system: mapConfig.system
      };
      await dbService.saveMapScene(campaign.id, newSceneName, currentConfig);
      setNewSceneName('');
      const updatedScenes = await dbService.listMapScenes(campaign.id);
      setScenes(updatedScenes);
  };

  const loadScene = async (sceneId: string) => {
      const scene = scenes.find(s => s.id === sceneId);
      if (scene) {
          if(window.confirm(`Carregar cena "${scene.name}"? Isso substituirá o mapa atual.`)) {
             setMapConfig(scene.config);
             setTokens(scene.config.tokens || []);
             setFogShapes(scene.config.fogShapes || []);
             setMapUrlInput(scene.config.imageUrl);
             await updateCampaign(scene.config);
          }
      }
  };

  const deleteScene = async (sceneId: string) => {
      if(window.confirm('Excluir este preset?')) {
          await dbService.deleteMapScene(sceneId);
          const updatedScenes = await dbService.listMapScenes(campaign.id);
          setScenes(updatedScenes);
      }
  }

  // --- DICE ROLLER LOGIC ---
  const handleMapRoll = () => {
    let diceCount = 0;
    let mode: 'highest' | 'lowest' = 'highest';
    
    // Determine Dice Count
    if (diceConfig.attribute === 'MANUAL') {
        diceCount = diceConfig.manualQty;
    } else if (selfData) {
        const attrVal = selfData.attributes[diceConfig.attribute as AttributeName] || 0;
        if (attrVal <= 0) {
            diceCount = 2;
            mode = 'lowest';
        } else {
            diceCount = attrVal;
            mode = 'highest';
        }
    } else {
        diceCount = diceConfig.manualQty;
    }

    let skillBonus = 0;
    if (selfData && diceConfig.skillName) {
        const skill = selfData.skills.find(s => s.name === diceConfig.skillName);
        if (skill) {
            skillBonus = skill.value + (skill.bonus || 0);
        }
    }
    const totalBonus = skillBonus + diceConfig.bonus;

    const rolls = [];
    for (let i = 0; i < Math.max(1, diceCount); i++) {
        rolls.push(Math.floor(Math.random() * 20) + 1);
    }

    let resultVal = 0;
    if (mode === 'highest') resultVal = Math.max(...rolls);
    else resultVal = Math.min(...rolls);

    setMapRollResult({
        total: resultVal + totalBonus,
        rolls: rolls,
        bonus: totalBonus,
        label: diceConfig.attribute === 'MANUAL' ? `${diceCount}d20` : diceConfig.attribute,
        discarded: mode === 'lowest'
    });
  };


  // --- ACCESS CHECK ---
  const hasAccess = isAdmin || (isIdentityVerified && mapConfig.allowedPlayers.includes(selectedIdentity!));
  const isPlayer = !isAdmin && isIdentityVerified && selectedIdentity;
  const myTokenOnMap = isPlayer ? tokens.find(t => t.id === selectedIdentity) : null;

  if (!isAdmin && !isIdentityVerified) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[500px] bg-black/50 border border-zinc-800 p-8">
               <ShieldAlert className="w-16 h-16 text-ordem-purple mb-6 animate-pulse" />
               <h2 className="text-2xl font-title font-bold text-white mb-2">SINCRONIZAÇÃO NEURO-LINK NECESSÁRIA</h2>
               <div className="w-full max-w-sm space-y-4">
                   <select className="w-full bg-black border border-zinc-700 text-white p-3 font-mono outline-none focus:border-ordem-purple" value={selectedIdentity || ''} onChange={e => setSelectedIdentity(e.target.value)}>
                       <option value="">SELECIONE SEU AGENTE</option>
                       {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   {selectedIdentity && (
                       <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
                           <Input type="password" placeholder="SENHA DE ACESSO" value={identityPassword} onChange={e => setIdentityPassword(e.target.value)}/>
                           {identityError && <p className="text-ordem-blood text-xs font-bold text-center">{identityError}</p>}
                           <Button onClick={handleIdentityLogin} variant="primary" className="w-full">SINCRONIZAR</Button>
                       </div>
                   )}
               </div>
          </div>
      );
  }

  if (!hasAccess && !isAdmin) {
      return (
          <div className="relative w-full h-[600px] overflow-hidden border border-ordem-purple/30 bg-black flex items-center justify-center">
               <div className="relative z-10 text-center">
                   <Lock className="w-24 h-24 text-ordem-purple mx-auto mb-4 opacity-50" />
                   <h1 className="text-4xl font-title font-black text-ordem-purple tracking-[0.5em] animate-pulse">SEM PERMISSÃO</h1>
               </div>
          </div>
      );
  }

  return (
    <div className={`flex flex-col lg:flex-row gap-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-black p-0 h-screen w-screen' : 'h-[calc(100vh-200px)] min-h-[600px]'}`}>
        
        {/* MAP AREA */}
        <div className="flex-grow bg-zinc-950 border border-zinc-800 relative overflow-hidden flex items-center justify-center group select-none"
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onContextMenu={handleContextMenu}
             ref={mapRef}
        >
             {/* BACKGROUND GRID */}
             <div className="absolute inset-0 pointer-events-none opacity-20" 
                  style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
             </div>

             {/* MAP IMAGE */}
             {mapConfig.imageUrl ? (
                 <img 
                    src={mapConfig.imageUrl} 
                    alt="Map" 
                    className="w-full h-full object-contain pointer-events-none select-none absolute inset-0 z-0 bg-black"
                 />
             ) : (
                 <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none z-0">
                    <MapIcon className="w-32 h-32 text-zinc-600 mb-4"/>
                    <span className="text-zinc-500 font-mono">Sem Imagem de Mapa</span>
                 </div>
             )}

             {/* TOKENS LAYER */}
             {tokens.map(token => {
                const isVisible = token.visible !== undefined ? token.visible : true;
                if (!isAdmin && !isVisible) return null;

                const charData = getCharData(token.id);
                
                // ROBUST IMAGE RESOLUTION LOGIC
                let displayImage = token.imageUrl || ''; // Default: Snapshot
                
                if (token.type === 'PLAYER' && charData) {
                    const variant = token.variant || 1;
                    const anyCharData = charData as any; // Allow indexing
                    
                    if (variant === 2 && anyCharData.tokenUrl2) displayImage = anyCharData.tokenUrl2;
                    else if (variant === 3 && anyCharData.tokenUrl3) displayImage = anyCharData.tokenUrl3;
                    else displayImage = anyCharData.tokenUrl || anyCharData.imageUrl || displayImage;
                }

                const zIndex = draggingTokenId === token.id ? 9999 : (10 + Math.floor(token.y));

                return (
                    <div
                        key={token.id} // Stable Key
                        onMouseDown={(e) => handleMouseDown(e, token.id)}
                        style={{ 
                            left: `${token.x}%`, 
                            top: `${token.y}%`,
                            height: `${150 * (token.size || 1)}px`,
                            width: 'auto',
                            transform: `translate(-50%, -100%) rotate(${token.rotation || 0}deg)`,
                            zIndex: zIndex,
                            opacity: (!isVisible && isAdmin) ? 0.4 : 1, 
                            filter: (!isVisible && isAdmin) ? 'grayscale(100%)' : 'none'
                        }}
                        className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing hover:brightness-110 transition-all select-none will-change-transform"
                    >
                        <div 
                            className="w-full h-full relative"
                            style={{ 
                                transform: token.flip ? 'scaleX(-1)' : 'none',
                                transition: 'transform 0.2s'
                            }}
                        >
                            {/* Image Component with Error Handling */}
                            {displayImage && (
                                <img 
                                    src={displayImage} 
                                    className="w-full h-full object-contain pointer-events-none drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]" 
                                    alt={token.label}
                                    draggable={false}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            )}
                            
                            {/* Fallback Icon */}
                            <div className={`w-full h-full min-w-[50px] min-h-[50px] flex items-center justify-center absolute inset-0 ${!displayImage ? 'flex' : 'hidden'} ${token.type === 'PLAYER' ? 'drop-shadow-[0_0_5px_rgba(0,255,157,0.5)]' : 'drop-shadow-[0_0_5px_rgba(183,0,44,0.5)]'}`}>
                                {token.type === 'PLAYER' ? <User className="text-zinc-300 w-full h-full opacity-80"/> : <Skull className="text-zinc-300 w-full h-full opacity-80"/>}
                            </div>
                        </div>
                        
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 bg-black/80 rounded border shadow-lg whitespace-nowrap pointer-events-none mt-1 absolute -bottom-6 ${token.type === 'PLAYER' ? 'text-ordem-green border-ordem-green' : 'text-ordem-blood border-ordem-blood'} ${isAdmin ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                            {token.label} {!isVisible && isAdmin && "(OCULTO)"}
                        </span>
                    </div>
                );
             })}

             {/* FOG OF WAR LAYER */}
             {fogShapes.map(fog => (
                 <div
                    key={fog.id}
                    style={{
                        position: 'absolute',
                        left: `${fog.x}%`,
                        top: `${fog.y}%`,
                        width: `${fog.width}%`,
                        height: `${fog.height}%`,
                        zIndex: 50, // Above normal tokens, below dragged
                        backgroundColor: 'black'
                    }}
                    onMouseDown={(e) => handleFogMouseDown(e, fog.id)}
                    className={`
                        ${isAdmin ? 'opacity-70 border border-ordem-purple/50 hover:border-ordem-purple cursor-move' : 'opacity-100'}
                    `}
                 >
                     {isAdmin && (
                         <>
                            <div className="absolute top-1 right-1">
                                <button onMouseDown={(e) => { e.stopPropagation(); removeFogShape(fog.id); }} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                            <div 
                                className="absolute bottom-0 right-0 p-1 cursor-nwse-resize text-zinc-500 hover:text-white"
                                onMouseDown={(e) => handleFogResizeDown(e, fog.id)}
                            >
                                <ArrowDownRight className="w-5 h-5" />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                <CloudFog className="w-8 h-8 text-white" />
                            </div>
                         </>
                     )}
                 </div>
             ))}

             {/* Fullscreen Controls */}
             {!isFullscreen && (
                 <div className="absolute top-4 right-4 z-[60] flex gap-2">
                     <button 
                        onClick={() => setIsFullscreen(true)} 
                        className="p-2 bg-black/60 border border-zinc-700 text-zinc-300 hover:text-white hover:border-white rounded transition-colors"
                        title="Tela Cheia"
                     >
                         <Maximize className="w-5 h-5"/>
                     </button>
                 </div>
             )}
             
             {isFullscreen && (
                 <button 
                    onClick={() => setIsFullscreen(false)} 
                    className="absolute top-4 left-4 z-[60] p-2 bg-black/60 border border-zinc-700 text-zinc-300 hover:text-white rounded transition-colors"
                    title="Sair da Tela Cheia"
                 >
                     <Minimize className="w-5 h-5"/>
                 </button>
             )}
        </div>

        {/* SIDEBAR */}
        {(isAdmin || isPlayer) && (
             <div className={`
                ${isFullscreen ? 'absolute top-0 right-0 bottom-0 z-[60] h-full shadow-2xl' : 'w-full lg:w-80 flex-shrink-0 h-full'} 
                bg-ordem-panel border-l border-zinc-800 flex flex-col transition-all duration-300 
                ${showTools ? (isFullscreen ? 'w-80' : '') : 'w-0 lg:w-0 overflow-hidden opacity-0 lg:opacity-100 lg:w-12 border-none'}
             `}>
                  <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-black/40">
                      {showTools && <span className="text-xs font-bold uppercase text-ordem-purple tracking-widest truncate">{isAdmin ? 'Painel de Controle' : 'Controles do Agente'}</span>}
                      <button onClick={() => setShowTools(!showTools)} className="text-zinc-500 hover:text-white"><Settings className="w-4 h-4" /></button>
                  </div>

                  {showTools && (
                      <div className="p-4 space-y-6 overflow-y-auto flex-grow custom-scrollbar">
                          {isAdmin && (
                              <>
                                  <div className="space-y-2">
                                      <label className="text-[10px] uppercase font-bold text-zinc-500">Imagem do Mapa</label>
                                      <div className="flex gap-2">
                                          <Input value={mapUrlInput} onChange={e => setMapUrlInput(e.target.value)} placeholder="URL..." className="text-xs bg-black" />
                                          <Button onClick={saveMapUrl} variant="primary" className="px-3"><Save className="w-4 h-4" /></Button>
                                      </div>
                                  </div>
                                  
                                  {/* GM SCENE SAVING */}
                                  <div className="border-t border-zinc-800 pt-2">
                                      <div onClick={() => setShowSceneTools(!showSceneTools)} className="flex items-center justify-between cursor-pointer hover:bg-white/5 p-1 rounded">
                                          <label className="text-[10px] uppercase font-bold text-ordem-green flex items-center gap-2"><FolderOpen className="w-3 h-3"/> Presets de Mapa</label>
                                          <Settings className="w-3 h-3 text-zinc-600" />
                                      </div>
                                      
                                      {showSceneTools && (
                                          <div className="bg-black/30 border border-zinc-700 p-2 mt-2 space-y-2 rounded">
                                              <div className="flex gap-2">
                                                  <Input value={newSceneName} onChange={e => setNewSceneName(e.target.value)} placeholder="Nome do Preset..." className="text-xs h-8"/>
                                                  <Button onClick={saveScene} variant="secondary" className="px-2 h-8" title="Salvar Estado Atual"><Save className="w-4 h-4" /></Button>
                                              </div>
                                              <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                                                  {scenes.map(scene => (
                                                      <div key={scene.id} className="flex justify-between items-center text-xs text-zinc-400 bg-black/50 p-1 px-2 border border-zinc-800 hover:border-ordem-purple">
                                                          <button onClick={() => loadScene(scene.id)} className="hover:text-white truncate max-w-[120px] text-left">{scene.name}</button>
                                                          <button onClick={() => deleteScene(scene.id)} className="text-zinc-600 hover:text-ordem-blood"><Trash2 className="w-3 h-3"/></button>
                                                      </div>
                                                  ))}
                                                  {scenes.length === 0 && <span className="text-[9px] text-zinc-600 italic block text-center">Sem presets salvos.</span>}
                                              </div>
                                          </div>
                                      )}
                                  </div>

                                  <div className="border-t border-zinc-800 pt-2">
                                      <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Ferramentas</label>
                                      <Button onClick={addFogShape} variant="secondary" className="w-full text-xs flex items-center justify-center gap-2"><CloudFog className="w-3 h-3"/> Adicionar Névoa</Button>
                                  </div>

                                  <div className="border-t border-zinc-800 pt-2">
                                      <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Agentes em Campo</label>
                                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                          {characters.map(char => {
                                              const isOnMap = tokens.find(t => t.id === char.id);
                                              const hasPermission = mapConfig.allowedPlayers?.includes(char.id);
                                              return (
                                                  <div key={char.id} className="bg-black/40 p-2 border border-zinc-800 flex flex-col gap-2">
                                                      <div className="flex justify-between items-center">
                                                          <span className="text-xs font-bold text-white truncate w-24">{char.name}</span>
                                                          <div className="flex gap-1">
                                                              <button onClick={() => togglePermission(char.id)} className={`p-1 rounded ${hasPermission ? 'text-ordem-green bg-ordem-green/10' : 'text-zinc-600'}`}><Eye className="w-3 h-3" /></button>
                                                              <button onClick={() => isOnMap ? removeTokenFromMap(char.id) : addTokenToMap(char.id, 'PLAYER', char.name, char.tokenUrl || '')} className={`p-1 rounded ${isOnMap ? 'text-ordem-purple bg-ordem-purple/10' : 'text-zinc-600'}`}>{isOnMap ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}</button>
                                                          </div>
                                                      </div>
                                                      {isOnMap && (
                                                         <div className="flex flex-col gap-2 border-t border-zinc-800 pt-1 mt-1">
                                                             <div className="flex items-center justify-between">
                                                                 <div className="flex items-center gap-1">
                                                                     <button onClick={() => updateTokenSize(char.id, -0.1)} className="text-zinc-500 hover:text-white"><Minus className="w-3 h-3"/></button>
                                                                     <span className="text-[10px] text-zinc-400 font-mono">{(isOnMap.size || 1).toFixed(1)}x</span>
                                                                     <button onClick={() => updateTokenSize(char.id, 0.1)} className="text-zinc-500 hover:text-white"><Plus className="w-3 h-3"/></button>
                                                                 </div>
                                                                 <button onClick={() => toggleTokenFlip(char.id)} className={`text-zinc-500 hover:text-white ${isOnMap.flip ? 'text-ordem-purple' : ''}`}><ArrowLeftRight className="w-3 h-3" /></button>
                                                             </div>
                                                             <div className="flex gap-1 justify-between bg-black/30 p-1 rounded">
                                                                 <button onClick={() => setTokenVariant(char.id, 1)} className={`flex-1 text-[9px] font-bold ${(!isOnMap.variant || isOnMap.variant === 1) ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:bg-zinc-800'}`}>PADRÃO</button>
                                                                 <button onClick={() => setTokenVariant(char.id, 2)} className={`flex-1 text-[9px] font-bold ${isOnMap.variant === 2 ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:bg-zinc-800'}`}>ALT</button>
                                                                 <button onClick={() => setTokenVariant(char.id, 3)} className={`flex-1 text-[9px] font-bold ${isOnMap.variant === 3 ? 'bg-ordem-blood text-white' : 'text-zinc-500 hover:bg-zinc-800'}`}>MORTE</button>
                                                             </div>
                                                         </div>
                                                      )}
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                                  <div className="border-t border-zinc-800 my-2"></div>
                                  <div>
                                      <label className="text-[10px] uppercase font-bold text-ordem-blood mb-2 block flex items-center gap-2"><Skull className="w-3 h-3"/> Ameaças</label>
                                      <div className="bg-black/30 border border-ordem-blood/30 p-3 mb-4 rounded space-y-2">
                                          <Input value={newMonster.name} onChange={e => setNewMonster({...newMonster, name: e.target.value})} placeholder="Nome" className="text-xs bg-black text-white" wrapperClassName="w-full"/>
                                          <Input value={newMonster.url} onChange={e => setNewMonster({...newMonster, url: e.target.value})} placeholder="URL Imagem" className="text-xs bg-black text-white" wrapperClassName="w-full"/>
                                          <div className="flex items-center gap-2"><input type="checkbox" checked={!newMonster.visible} onChange={e => setNewMonster({...newMonster, visible: !e.target.checked})} className="accent-ordem-blood"/><label className="text-[10px] text-zinc-400 uppercase">Invisível</label></div>
                                          <Button onClick={createMonster} variant="danger" className="w-full h-8 text-xs"><Plus className="w-3 h-3 mr-1" /> ADD</Button>
                                      </div>
                                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                                          {tokens.filter(t => t.type === 'MONSTER').map(monster => (
                                              <div key={monster.id} className={`bg-ordem-blood/10 p-2 border ${monster.visible ? 'border-ordem-blood/30' : 'border-zinc-700 opacity-75'} flex flex-col gap-2`}>
                                                  <div className="flex justify-between items-center">
                                                      <span className={`text-xs font-bold truncate w-20 ${monster.visible ? 'text-ordem-blood' : 'text-zinc-500'}`}>{monster.label}</span>
                                                      <div className="flex gap-1"><button onClick={() => toggleTokenVisibility(monster.id)} className="text-zinc-500 hover:text-white">{monster.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}</button><button onClick={() => removeTokenFromMap(monster.id)} className="text-zinc-500 hover:text-ordem-blood"><Trash2 className="w-3 h-3" /></button></div>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              </>
                          )}

                          {isPlayer && myTokenOnMap && (
                              <div className="space-y-6">
                                  {/* TOKEN CONTROLS */}
                                  <div className="bg-black/40 p-4 border border-zinc-800 space-y-4">
                                      <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 border border-ordem-green overflow-hidden bg-black flex items-center justify-center">
                                                {/* Preview current variant */}
                                                {(() => {
                                                    const cd = getCharData(myTokenOnMap.id) as any;
                                                    let src = myTokenOnMap.imageUrl;
                                                    if (cd) {
                                                        if (myTokenOnMap.variant === 2 && cd.tokenUrl2) src = cd.tokenUrl2;
                                                        else if (myTokenOnMap.variant === 3 && cd.tokenUrl3) src = cd.tokenUrl3;
                                                        else src = cd.tokenUrl || cd.imageUrl || src;
                                                    }
                                                    return src ? <img src={src} className="w-full h-full object-contain" /> : <User className="text-zinc-500"/>;
                                                })()}
                                            </div>
                                            <div><span className="text-xs font-bold text-white block uppercase">{myTokenOnMap.label}</span><span className="text-[10px] text-ordem-green uppercase tracking-widest">Sincronizado</span></div>
                                      </div>
                                      <div>
                                          <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Estado</label>
                                          <div className="grid grid-cols-3 gap-1">
                                              <button onClick={() => setTokenVariant(myTokenOnMap.id, 1)} className={`p-2 border text-[9px] font-bold uppercase ${(!myTokenOnMap.variant || myTokenOnMap.variant === 1) ? 'border-zinc-500 bg-zinc-700 text-white' : 'border-zinc-800 bg-black text-zinc-500'}`}>Padrão</button>
                                              <button onClick={() => setTokenVariant(myTokenOnMap.id, 2)} className={`p-2 border text-[9px] font-bold uppercase ${myTokenOnMap.variant === 2 ? 'border-zinc-500 bg-zinc-700 text-white' : 'border-zinc-800 bg-black text-zinc-500'}`}>Var 2</button>
                                              <button onClick={() => setTokenVariant(myTokenOnMap.id, 3)} className={`p-2 border text-[9px] font-bold uppercase ${myTokenOnMap.variant === 3 ? 'border-ordem-blood bg-ordem-blood text-white' : 'border-zinc-800 bg-black text-zinc-500'}`}>Morte</button>
                                          </div>
                                      </div>
                                      <div className="flex gap-2">
                                          <button onClick={() => updateTokenSize(myTokenOnMap.id, -0.1)} className="flex-1 bg-black border border-zinc-700 text-white p-2 text-xs font-bold">- Tam</button>
                                          <button onClick={() => toggleTokenFlip(myTokenOnMap.id)} className="flex-1 bg-black border border-zinc-700 text-white p-2 text-xs font-bold">Espelhar</button>
                                          <button onClick={() => updateTokenSize(myTokenOnMap.id, 0.1)} className="flex-1 bg-black border border-zinc-700 text-white p-2 text-xs font-bold">+ Tam</button>
                                      </div>
                                  </div>

                                  {/* DICE ROLLER IN MAP */}
                                  <div className="bg-black/40 p-4 border border-zinc-800 relative">
                                        <div className="flex items-center gap-2 mb-4 border-b border-zinc-700 pb-2">
                                            <Dices className="w-4 h-4 text-ordem-green" />
                                            <span className="text-xs font-bold uppercase text-white">Rolagem Rápida</span>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Attribute Select */}
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-zinc-500 uppercase font-bold">Quantidade de Dados</label>
                                                <div className="flex gap-2">
                                                    <select 
                                                        className="bg-black border border-zinc-700 text-white text-xs p-2 flex-grow outline-none"
                                                        value={diceConfig.attribute}
                                                        onChange={(e) => setDiceConfig({...diceConfig, attribute: e.target.value})}
                                                    >
                                                        {ATTRIBUTES.map(attr => (
                                                            <option key={attr} value={attr}>{attr} {selfData ? `(${selfData.attributes[attr as AttributeName]})` : ''}</option>
                                                        ))}
                                                        <option value="MANUAL">Manual</option>
                                                    </select>
                                                    {diceConfig.attribute === 'MANUAL' && (
                                                        <Input 
                                                            type="number" 
                                                            value={diceConfig.manualQty} 
                                                            onChange={e => setDiceConfig({...diceConfig, manualQty: parseInt(e.target.value) || 1})} 
                                                            className="w-16 text-center h-[34px]"
                                                            wrapperClassName="w-auto"
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Bonus Select */}
                                            <div className="space-y-1">
                                                <label className="text-[9px] text-zinc-500 uppercase font-bold">Bônus (Perícia + Extra)</label>
                                                <div className="flex gap-2">
                                                    <select 
                                                        className="bg-black border border-zinc-700 text-white text-xs p-2 flex-grow outline-none"
                                                        value={diceConfig.skillName}
                                                        onChange={(e) => setDiceConfig({...diceConfig, skillName: e.target.value})}
                                                    >
                                                        <option value="">Nenhuma</option>
                                                        {selfData?.skills.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                                                            <option key={s.name} value={s.name}>{s.name} (+{s.value + (s.bonus||0)})</option>
                                                        ))}
                                                    </select>
                                                    <Input 
                                                        type="number" 
                                                        placeholder="+0"
                                                        value={diceConfig.bonus} 
                                                        onChange={e => setDiceConfig({...diceConfig, bonus: parseInt(e.target.value) || 0})} 
                                                        className="w-16 text-center h-[34px]"
                                                        wrapperClassName="w-auto"
                                                    />
                                                </div>
                                            </div>

                                            <Button variant="secondary" onClick={handleMapRoll} className="w-full">
                                                ROLAR
                                            </Button>

                                            {/* Result Display */}
                                            {mapRollResult && (
                                                <div className="mt-4 p-3 bg-black border border-zinc-700 animate-in slide-in-from-top-2">
                                                    <div className="flex justify-between items-end mb-1">
                                                        <span className="text-[9px] text-zinc-500 uppercase font-bold">{mapRollResult.label}</span>
                                                        <span className="text-[9px] text-zinc-500 uppercase font-bold">{mapRollResult.discarded ? 'PIOR' : 'MAIOR'}</span>
                                                    </div>
                                                    <div className="flex items-baseline justify-between">
                                                        <span className="text-3xl font-black text-ordem-green drop-shadow-[0_0_5px_rgba(0,255,157,0.5)]">
                                                            {mapRollResult.total}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-zinc-400">
                                                            [{mapRollResult.rolls.join(', ')}] {mapRollResult.bonus >= 0 ? '+' : ''}{mapRollResult.bonus}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
             </div>
        )}
    </div>
  );
};