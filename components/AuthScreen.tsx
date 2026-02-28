import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { dbService } from '../services/dbService';
import { Ghost, ShieldCheck, UserPlus, AlertTriangle, Info, KeyRound } from 'lucide-react';
import { User } from '../types';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface Props {
  onLogin: (user: User) => void;
}

export const AuthScreen: React.FC<Props> = ({ onLogin }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!username || !password) throw new Error("Preencha todos os campos.");

      if (mode === 'LOGIN') {
        const user = await dbService.login(username, password);
        if (user) {
          onLogin(user);
        } else {
          setError("Credenciais inválidas.");
        }
      } else {
        // Register
        const user = await dbService.register(username, password);
        onLogin(user); // Auto login after register
      }
    } catch (err: any) {
      setError(err.message || "Erro na operação.");
    } finally {
      setLoading(false);
    }
  };

  if (showForgot) {
    return <ForgotPasswordModal onClose={() => setShowForgot(false)} />;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-tech">
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05]" 
           style={{ backgroundImage: 'linear-gradient(rgba(124, 58, 237, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-transparent via-ordem-purple/10 to-transparent animate-spin-slow"></div>
      </div>

      <div className="bg-ordem-panel border border-ordem-purple p-8 max-w-md w-full relative z-10 shadow-[0_0_50px_rgba(124,58,237,0.2)]">
        
        {/* Header */}
        <div className="text-center mb-10">
            <div className="inline-block p-4 rounded-xl border border-ordem-purple bg-black shadow-[0_0_20px_rgba(124,58,237,0.4)] mb-4">
               <Ghost className="w-10 h-10 text-ordem-purple" />
            </div>
            <h1 className="text-3xl font-title font-black text-white uppercase tracking-[0.2em]">Ordem <span className="text-ordem-purple">Files</span></h1>
            <p className="text-xs text-ordem-muted font-mono tracking-widest uppercase mt-2">Acesso Seguro V3.0</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <Input 
                  label="Identificação (Username)" 
                  value={username} 
                  onChange={e => setUsername(e.target.value.trim())} 
                  placeholder="Agente..."
                  autoFocus
                  className="bg-black"
              />
              <div className="space-y-1">
                <Input 
                    label="Senha de Acesso" 
                    type="password"
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="bg-black"
                />
                {mode === 'LOGIN' && (
                  <div className="flex justify-end">
                    <button 
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-[10px] uppercase tracking-wider text-ordem-purple hover:text-white transition-colors flex items-center gap-1"
                    >
                      <KeyRound size={10} /> Esqueci minha senha
                    </button>
                  </div>
                )}
              </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 justify-center text-ordem-blood text-xs font-bold font-mono animate-pulse bg-ordem-blood/10 p-2 border border-ordem-blood/30">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
            )}

            <Button variant="primary" type="submit" isLoading={loading} className="w-full text-lg py-6">
                {mode === 'LOGIN' ? 'INICIAR SESSÃO' : 'CRIAR CREDENCIAL'}
            </Button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center">
             <button 
                type="button"
                onClick={() => { setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setError(''); }}
                className="text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest flex items-center justify-center gap-2 mx-auto transition-colors"
             >
                 {mode === 'LOGIN' ? (
                     <><UserPlus className="w-3 h-3"/> Requisitar Novo Acesso</>
                 ) : (
                     <><ShieldCheck className="w-3 h-3"/> Voltar para Login</>
                 )}
             </button>
        </div>

        {/* Migration Notice */}
        <div className="mt-8 bg-zinc-900/50 border border-zinc-800 p-4 rounded relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-600"></div>
            <div className="flex gap-3 items-start">
                <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-zinc-400 font-mono leading-relaxed uppercase">
                    <strong className="text-yellow-600 block mb-1">Aviso de Migração</strong>
                    Se você usou o site nas versões anteriores e já tinha uma campanha, entre em contato com o user <span className="text-white font-bold">"muc"</span> no Discord.
                    <br/><br/>
                    Se estava jogando uma campanha, entre em contato com o Mestre da mesma.
                </p>
            </div>
        </div>

      </div>
    </div>
  );
};