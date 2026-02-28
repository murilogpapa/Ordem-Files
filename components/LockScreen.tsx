import React, { useState } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { verifyPassword } from '../services/cryptoService';

interface Props {
  characterName: string;
  passwordHash: string;
  masterHash?: string; // Optional Campaign Admin Password that also unlocks this
  onUnlock: () => void;
  onCancel: () => void;
  title?: string;
}

export const LockScreen: React.FC<Props> = ({ 
  characterName, 
  passwordHash, 
  masterHash, 
  onUnlock, 
  onCancel,
  title = "ACESSO RESTRITO"
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate "decrypting" delay
    setTimeout(async () => {
      try {
        // Check Character Password
        let isValid = await verifyPassword(password, passwordHash);
        
        // If failed, check Master Key (if provided)
        if (!isValid && masterHash) {
          isValid = await verifyPassword(password, masterHash);
        }

        if (isValid) {
          onUnlock();
        } else {
          setError('Sinal de descriotografia falhou. Acesso negado.');
        }
      } catch (err) {
        setError('Erro crítico no sistema.');
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-500">
      <div className="relative w-full max-w-lg">
        
        {/* Arcane Ring Animation Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] opacity-10 pointer-events-none">
             <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-slow text-ordem-purple fill-current">
                <path d="M50 0 A50 50 0 1 0 50 100 A50 50 0 1 0 50 0 Z M50 5 A45 45 0 1 1 50 95 A45 45 0 1 1 50 5 Z" />
                <path d="M50 10 A40 40 0 0 0 50 90" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="5,5" />
             </svg>
        </div>

        <div className="bg-ordem-panel/80 border-y-2 border-ordem-blood p-10 shadow-[0_0_50px_rgba(183,0,44,0.2)] relative overflow-hidden backdrop-blur-xl">
          {/* Scanline inside modal */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%]"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-6 relative">
              <div className="w-20 h-20 bg-black flex items-center justify-center border-2 border-ordem-blood rotate-45">
                 <div className="-rotate-45">
                    <Lock className="w-8 h-8 text-ordem-blood drop-shadow-[0_0_8px_rgba(183,0,44,0.8)]" />
                 </div>
              </div>
              <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-ordem-blood"></div>
              <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-ordem-blood"></div>
            </div>

            <h2 className="text-3xl font-title font-bold text-white text-center mb-1 tracking-widest text-shadow-red">{title}</h2>
            <p className="text-ordem-blood font-mono uppercase text-xs tracking-[0.3em] mb-8 animate-pulse">Nível de Acreditação Requerido</p>
            
            <div className="w-full bg-black/50 p-2 border border-white/10 mb-6 text-center">
              <span className="text-zinc-500 font-mono text-xs">ALVO DO ARQUIVO:</span>
              <p className="text-white font-title text-xl mt-1">{characterName}</p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-6">
              <div className="relative">
                <Input 
                  type="password" 
                  placeholder="INSIRA CÓDIGO" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  className="text-center tracking-[0.5em] font-mono text-2xl border-ordem-blood focus:border-ordem-blood focus:shadow-[0_0_15px_rgba(183,0,44,0.3)]"
                />
              </div>
              
              {error && (
                <div className="flex items-center gap-2 justify-center text-ordem-blood text-xs font-bold font-mono animate-glitch">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 text-zinc-500">
                  ABORTAR
                </Button>
                <Button type="submit" variant="danger" isLoading={loading} className="flex-1">
                  DESBLOQUEAR
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};