import React, { useState, useEffect } from 'react';
import { CharacterSummary, Character, Campaign, User } from './types';
import { dbService } from './services/dbService';
import { CharacterSheet } from './components/CharacterSheet';
import { LockScreen } from './components/LockScreen';
import { CreateSheetWizard } from './components/CreateSheetWizard';
import { CreateCampaignWizard } from './components/CreateCampaignWizard';
import { CampaignView } from './components/CampaignView';
import { Button } from './components/ui/Button';
import { Plus, Ghost, Folder, User as UserIcon, X, Sparkles, Star, LogIn, Key, Search, AlertTriangle, LogOut, Shield } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { EmailLinkModal } from './components/EmailLinkModal';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';

type ViewState = 'campaign-list' | 'create-campaign' | 'campaign-view' | 'create-character' | 'character-sheet' | 'character-lock';

const CURRENT_VERSION = 'v3.0';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [view, setView] = useState<ViewState>('campaign-list');
  
  // Data State
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedCharSummary, setSelectedCharSummary] = useState<CharacterSummary | null>(null);
  const [selectedCharFull, setSelectedCharFull] = useState<Character | null>(null);
  
  // Favorites State
  const [favoriteCampaigns, setFavoriteCampaigns] = useState<string[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [showPatchNotes, setShowPatchNotes] = useState(false);

  // Email & Security State
  const [showEmailLink, setShowEmailLink] = useState(false);
  const [skippedEmailSetup, setSkippedEmailSetup] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  
  // Initial Load & Auth Check
  useEffect(() => {
    // Check for Reset Token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const sessionUser = localStorage.getItem("sessionUser");
    if (sessionUser) {
        setCurrentUser(JSON.parse(sessionUser));
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
        loadCampaigns();
        loadLocalData();
        checkVersion();

        // Check Email Status
        if (!skippedEmailSetup) {
          if (!currentUser.email) {
            setShowEmailLink(true);
          }
        }

        const subscription = dbService.subscribeToCampaignList(() => {
            loadCampaigns();
        });

        return () => {
            subscription.unsubscribe();
        };
    }
  }, [currentUser, skippedEmailSetup]);

  const handleLogin = (user: User) => {
      localStorage.setItem("sessionUser", JSON.stringify(user));
      setCurrentUser(user);
      setSkippedEmailSetup(false); // Reset skip on new login
  };

  const handleLogout = () => {
      localStorage.removeItem("sessionUser");
      setCurrentUser(null);
      setAllCampaigns([]);
      setView('campaign-list');
      setSkippedEmailSetup(false);
  };

  const handleEmailSuccess = (email: string) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, email };
      setCurrentUser(updatedUser);
      localStorage.setItem("sessionUser", JSON.stringify(updatedUser));
      setShowEmailLink(false);
      alert("E-mail vinculado! Verifique sua caixa de entrada para confirmar.");
    }
  };

  const checkVersion = () => {
      const savedVersion = localStorage.getItem('ordem_patch_version');
      if (savedVersion !== CURRENT_VERSION) {
          setShowPatchNotes(true);
          localStorage.setItem('ordem_patch_version', CURRENT_VERSION);
      }
  };

  const loadCampaigns = async () => {
    if (!currentUser) return;
    setLoading(true);
    // listCampaigns now handles filtering by permissions internally
    const list = await dbService.listCampaigns(currentUser);
    setAllCampaigns(list);
    setLoading(false);
  };

  const loadLocalData = () => {
      const savedFavs = localStorage.getItem('ordem_favorite_campaigns');
      if (savedFavs) {
          try { setFavoriteCampaigns(JSON.parse(savedFavs)); } catch (e) {}
      }
  };

  const toggleFavoriteCampaign = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newFavs = favoriteCampaigns.includes(id) 
          ? favoriteCampaigns.filter(favId => favId !== id)
          : [...favoriteCampaigns, id];
      
      setFavoriteCampaigns(newFavs);
      localStorage.setItem('ordem_favorite_campaigns', JSON.stringify(newFavs));
  };

  // --- Navigation Handlers ---
  const handleSelectCampaign = (campaign: Campaign) => {
      setSelectedCampaign(campaign);
      setView('campaign-view');
  };

  const handleDeleteCampaign = () => {
      loadCampaigns();
      setView('campaign-list');
      setSelectedCampaign(null);
  };

  // --- Character Handlers ---
  const handleSelectCharacter = async (char: CharacterSummary) => {
    // Permission Check: Owner or GM
    const isOwner = char.ownerId === currentUser?.id;
    const isGM = selectedCampaign?.ownerId === currentUser?.id || currentUser?.isGlobalAdmin;

    if (isOwner || isGM) {
        // Direct Access
        setLoading(true);
        const fullData = await dbService.getCharacterById(char.id);
        if (fullData) {
            setSelectedCharFull(fullData);
            setView('character-sheet');
        }
        setLoading(false);
    } else {
        // Just View Summary/Lock (Currently V3.0 implies strict ownership access for sheet edit)
        // For now, if not owner/GM, we prevent opening or show limited view.
        // Prompt says "Jogadores só acessam fichas vinculadas ao seu usuário."
        alert("Acesso Negado: Apenas o dono ou mestre pode acessar esta ficha.");
    }
  };

  const handleAdminOpenSheet = async (charId: string) => {
      setLoading(true);
      const fullData = await dbService.getCharacterById(charId);
      if (fullData) {
          setSelectedCharFull(fullData);
          setView('character-sheet');
      }
      setLoading(false);
  };

  const handleUpdateCharacter = (updated: Character) => {
    setSelectedCharFull(updated);
  };

  const handleReturnFromSheet = async () => {
    if (selectedCampaign) {
        setLoading(true);
        const updatedCampaign = await dbService.getCampaignById(selectedCampaign.id);
        if (updatedCampaign) {
            setSelectedCampaign(updatedCampaign);
        }
        setLoading(false);
    }
    setView('campaign-view');
    setSelectedCharFull(null);
    setSelectedCharSummary(null);
  };

  const handleDeleteCharacter = async () => {
    if (selectedCampaign) handleReturnFromSheet();
    else setView('campaign-list');
    setSelectedCharFull(null);
    setSelectedCharSummary(null);
  };

  // --- Render Helpers ---

  // Sort: Favorites first, then Date
  const sortedCampaigns = [...allCampaigns].sort((a, b) => {
      const aFav = favoriteCampaigns.includes(a.id);
      const bFav = favoriteCampaigns.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0; 
  });

  // Determine Role for View
  const getCurrentRole = (): 'ADMIN' | 'PLAYER' => {
      if (!currentUser || !selectedCampaign) return 'PLAYER';
      if (currentUser.isGlobalAdmin) return 'ADMIN';
      if (selectedCampaign.ownerId === currentUser.id) return 'ADMIN';
      
      // Check members list logic handled in listCampaigns, assume if I see it and not owner, I am player
      // But we can double check in DB service or just rely on ownerId for GM status
      return 'PLAYER';
  }

  if (resetToken) {
    return <ResetPasswordScreen onSuccess={() => setResetToken(null)} />;
  }

  if (!currentUser) {
      return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-black text-ordem-text font-tech selection:bg-ordem-purple selection:text-white pb-10 relative overflow-hidden">
      
      {/* Security Modals */}
      {showEmailLink && currentUser && (
        <EmailLinkModal 
          userId={currentUser.id} 
          onSuccess={handleEmailSuccess} 
          onSkip={() => { setShowEmailLink(false); setSkippedEmailSetup(true); }} 
        />
      )}

      {/* Security Warning Banner */}
      {!currentUser.email && (
        <div className="bg-yellow-900/20 border-b border-yellow-900/50 p-2 text-center text-xs text-yellow-500 flex items-center justify-center gap-2 relative z-50">
          <AlertTriangle size={14} />
          <span>Sua conta não está segura. Vincule um e-mail para evitar perda de acesso.</span>
          <button 
            onClick={() => { setSkippedEmailSetup(false); setShowEmailLink(true); }}
            className="underline hover:text-yellow-400"
          >
            Resolver agora
          </button>
        </div>
      )}
      
      <div className="fixed inset-0 pointer-events-none opacity-[0.05]" 
           style={{ backgroundImage: 'linear-gradient(rgba(124, 58, 237, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-transparent via-ordem-purple/10 to-transparent animate-spin-slow"></div>
      </div>

      <div className="relative z-10 p-4 md:p-8">

        {/* --- PATCH NOTES MODAL --- */}
        {showPatchNotes && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-ordem-panel border border-ordem-purple p-8 max-w-2xl w-full relative shadow-[0_0_50px_rgba(124,58,237,0.2)] max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={() => setShowPatchNotes(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
              
              <div className="flex items-center gap-3 mb-2">
                 <Sparkles className="text-ordem-purple w-6 h-6" />
                 <h2 className="text-3xl font-title font-black text-white">PATCH NOTE <span className="text-ordem-purple">{CURRENT_VERSION}</span></h2>
              </div>
              <div className="border-b border-zinc-800 mb-8 pb-4"></div>
              
              <div className="space-y-8 font-mono text-sm text-zinc-300 leading-relaxed">
                <section>
                    <h3 className="text-white font-bold text-lg mb-3 uppercase tracking-wider border-l-4 border-white pl-3">SISTEMA DE AUTENTICAÇÃO V3.0</h3>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong className="text-white">Login & Cadastro:</strong> Novo sistema de contas de usuário. Cadastre-se com um username único para acessar suas campanhas.</li>
                        <li><strong className="text-white">Convites por Username:</strong> Mestres agora convidam jogadores diretamente pelo nome de usuário. Não é mais necessário compartilhar senhas de campanha.</li>
                        <li><strong className="text-white">Permissões:</strong> Jogadores veem apenas campanhas onde foram convidados. Mestres veem campanhas que criaram ou onde foram promovidos.</li>
                        <li><strong className="text-white">Admin Global:</strong> Adicionado usuário 'admin' para gerenciamento total do sistema.</li>
                        <li><strong className="text-white">Senhas Antigas Removidas:</strong> O sistema de senha por ficha/campanha foi descontinuado em favor do login seguro.</li>
                    </ul>
                </section>
                <section>
                    <h3 className="text-ordem-purple font-bold text-lg mb-3 uppercase tracking-wider border-l-4 border-ordem-purple pl-3">COMBATE & MAPA</h3>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong className="text-white">Névoa de Guerra:</strong> Nova ferramenta para o Mestre criar áreas de escuridão (Fog of War) que escondem partes do mapa dos jogadores.</li>
                        <li><strong className="text-white">Cenas (Presets):</strong> Sistema de salvar/carregar estados do mapa.</li>
                        <li><strong className="text-white">Rolagem Rápida no Mapa:</strong> Adicionado painel de rolagem de dados nos "Controles do Agente".</li>
                    </ul>
                </section>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
                  <Button onClick={() => setShowPatchNotes(false)} variant="primary" className="w-full">Entendido</Button>
              </div>
            </div>
          </div>
        )}

        {/* === CAMPAIGN LIST (DASHBOARD) === */}
        {view === 'campaign-list' && (
          <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row justify-between items-center mb-16 border-b border-white/10 pb-8 relative">
              <div className="absolute -bottom-[1px] left-0 w-1/3 h-[2px] bg-gradient-to-r from-ordem-purple to-transparent"></div>
              <div className="flex items-center gap-4 group">
                <div className="bg-black border border-ordem-purple p-3 relative overflow-hidden shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                    <Ghost className="text-ordem-purple w-8 h-8 relative z-10" />
                    <div className="absolute inset-0 bg-ordem-purple/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </div>
                <div>
                  <h1 className="text-4xl font-title font-black text-white tracking-[0.2em] uppercase drop-shadow-md">Ordem <span className="text-ordem-purple">Files</span></h1>
                  <div className="flex items-center gap-2">
                      <p className="text-xs text-ordem-muted font-mono tracking-widest uppercase">Bem-vindo, <span className="text-white font-bold">{currentUser.username}</span></p>
                      {currentUser.isGlobalAdmin && <span className="text-[10px] bg-ordem-blood text-white px-1 font-bold">ADMIN</span>}
                  </div>
                </div>
                <button onClick={() => setShowPatchNotes(true)} className="ml-2 px-2 py-0.5 bg-ordem-purple/20 border border-ordem-purple text-ordem-purple text-[10px] font-bold uppercase rounded hover:bg-ordem-purple hover:text-white transition-all animate-pulse">{CURRENT_VERSION}</button>
              </div>
              
              <div className="mt-6 md:mt-0 flex gap-4 items-center">
                 <Button onClick={() => setView('create-campaign')} className="flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Nova Campanha
                 </Button>
                 <button onClick={handleLogout} className="text-zinc-500 hover:text-red-500 transition-colors p-2" title="Sair">
                     <LogOut className="w-6 h-6" />
                 </button>
              </div>
            </header>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="w-16 h-16 border-4 border-ordem-purple border-t-transparent rounded-full animate-spin"></div>
                <p className="text-ordem-purple font-mono text-sm animate-pulse tracking-widest">SINCRONIZANDO MISSÕES...</p>
              </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sortedCampaigns.map(camp => {
                        const isFav = favoriteCampaigns.includes(camp.id);
                        const role = (camp.ownerId === currentUser.id || currentUser.isGlobalAdmin) ? 'ADMIN' : 'PLAYER';
                        
                        return (
                            <div 
                                key={camp.id} 
                                onClick={() => handleSelectCampaign(camp)}
                                className="group bg-ordem-panel border border-ordem-border p-6 cursor-pointer hover:border-ordem-purple hover:shadow-[0_0_20px_rgba(124,58,237,0.1)] transition-all relative overflow-hidden"
                            >
                                <button 
                                    onClick={(e) => toggleFavoriteCampaign(e, camp.id)}
                                    className="absolute top-4 right-4 z-20 p-2 rounded-full hover:bg-black/50 transition-colors"
                                >
                                    <Star className={`w-5 h-5 transition-all duration-300 ${isFav ? "fill-yellow-500 text-yellow-500 scale-110" : "text-zinc-600 hover:text-yellow-500"}`} />
                                </button>

                                <div className="flex items-center gap-3 mb-4">
                                    <Folder className="w-8 h-8 text-ordem-muted group-hover:text-ordem-purple transition-colors" />
                                    {role === 'ADMIN' && <span className="text-[10px] uppercase font-bold text-ordem-blood bg-ordem-blood/10 px-2 py-1 border border-ordem-blood/20">Mestre</span>}
                                    {role === 'PLAYER' && <span className="text-[10px] uppercase font-bold text-ordem-green bg-ordem-green/10 px-2 py-1 border border-ordem-green/20">Agente</span>}
                                </div>

                                <h3 className="text-2xl font-title font-bold text-white mb-2 group-hover:text-ordem-purple transition-colors pr-8">{camp.name}</h3>
                                <div className="text-[10px] text-zinc-600 font-mono mb-4 bg-black/40 p-1 inline-block border border-zinc-800 select-all">ID: {camp.id}</div>
                                <p className="text-zinc-500 text-sm line-clamp-2 mb-4 h-10 font-mono">{camp.summary || "Sem descrição disponível."}</p>
                                
                                <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-auto">
                                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono uppercase">
                                        <UserIcon className="w-3 h-3" />
                                        Mestre: <span className="text-white">{camp.adminName}</span>
                                    </div>
                                    <span className="text-[10px] text-ordem-purple font-bold uppercase opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                                        Entrar &rarr;
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {sortedCampaigns.length === 0 && (
                         <div className="col-span-full text-center py-24 border border-dashed border-zinc-800 rounded bg-black/40">
                            <Folder className="w-16 h-16 text-zinc-700 mx-auto mb-4 opacity-50" />
                            <h3 className="text-zinc-400 font-bold mb-2">NENHUMA MISSÃO ENCONTRADA</h3>
                            <p className="text-zinc-600 font-mono text-sm max-w-md mx-auto">
                                Você não possui campanhas vinculadas. <br/>
                                Crie uma nova missão ou peça para um Mestre convidar seu usuário: <strong className="text-white">{currentUser.username}</strong>
                            </p>
                        </div>
                    )}
                </div>
            )}
          </div>
        )}

        {/* === CREATE CAMPAIGN === */}
        {view === 'create-campaign' && (
             <CreateCampaignWizard 
                onCancel={() => setView('campaign-list')}
                onCreated={() => {
                    loadLocalData(); 
                    loadCampaigns();
                    setView('campaign-list');
                }}
             />
        )}

        {/* === CAMPAIGN VIEW === */}
        {view === 'campaign-view' && selectedCampaign && (
            <CampaignView 
                campaign={selectedCampaign}
                role={getCurrentRole()} 
                onBack={() => setView('campaign-list')}
                onSelectCharacter={handleSelectCharacter}
                onCreateCharacter={() => setView('create-character')}
                onDeleteCampaign={handleDeleteCampaign}
                onAdminOpenSheet={handleAdminOpenSheet}
            />
        )}

        {/* === CREATE CHARACTER === */}
        {view === 'create-character' && selectedCampaign && (
            <div className="animate-in zoom-in-95 duration-300">
                <CreateSheetWizard 
                    campaignId={selectedCampaign.id}
                    onCancel={() => setView('campaign-view')}
                    onCreated={() => setView('campaign-view')}
                />
            </div>
        )}

        {/* === CHARACTER SHEET === */}
        {view === 'character-sheet' && selectedCharFull && (
             <CharacterSheet 
                character={selectedCharFull}
                onBack={handleReturnFromSheet}
                onUpdate={handleUpdateCharacter}
                onDelete={handleDeleteCharacter}
             />
        )}
      </div>
    </div>
  );
};

export default App;