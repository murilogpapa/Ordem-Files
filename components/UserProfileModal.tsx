import React, { useState } from 'react';
import { User } from '../types';
import { dbService } from '../services/dbService';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, User as UserIcon, Mail, Lock, Image as ImageIcon, Save, Check, AlertTriangle } from 'lucide-react';

interface Props {
  user: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
}

export const UserProfileModal: React.FC<Props> = ({ user, onClose, onUpdate }) => {
  const [username, setUsername] = useState(user.username);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState(user.email || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdateProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Update Public Profile (Username, Avatar)
      if (username !== user.username || avatarUrl !== user.avatarUrl) {
         // Check if username taken if changed
         if (username !== user.username) {
             const existing = await dbService.getUserByUsername(username);
             if (existing) throw new Error("Nome de usuário já está em uso.");
         }
         
         await dbService.updateUserProfile(user.id, { 
             username, 
             avatarUrl: avatarUrl || undefined 
         });
      }

      // 2. Update Password if provided
      if (password) {
          if (password !== confirmPassword) throw new Error("As senhas não coincidem.");
          if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
          await dbService.updatePassword(password);
      }

      // 3. Update Email if changed (This triggers Supabase flow usually, but we'll try direct link)
      // Note: Changing email usually requires re-verification. 
      // For now, we'll stick to the existing linkAccount flow if they want to change email, 
      // but maybe we can just trigger it here if they input a new one.
      // However, the prompt asked for a button to change email.
      // Since we have linkAccount logic, let's reuse that if email is different.
      if (email && email !== user.email) {
          await dbService.updateUserEmail(email);
          // Also update public table
          await dbService.updateUserProfile(user.id, { email }); 
      }

      onUpdate({ ...user, username, avatarUrl, email });
      setSuccess("Perfil atualizado com sucesso!");
      setTimeout(() => {
          setSuccess('');
          onClose();
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-ordem-panel border border-ordem-purple w-full max-w-md relative shadow-[0_0_50px_rgba(124,58,237,0.2)]">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
            <X className="w-6 h-6" />
        </button>

        <div className="p-6 border-b border-zinc-800 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-black border border-ordem-purple flex items-center justify-center overflow-hidden relative group">
                {avatarUrl ? (
                    <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                    <UserIcon className="w-8 h-8 text-ordem-purple" />
                )}
            </div>
            <div>
                <h2 className="text-xl font-title font-bold text-white">Editar Perfil</h2>
                <p className="text-xs text-zinc-500 font-mono uppercase">Agente: {user.username}</p>
            </div>
        </div>

        <div className="p-6 space-y-6">
            {error && (
                <div className="bg-red-900/20 border border-red-900/50 p-3 rounded flex items-center gap-2 text-red-400 text-xs">
                    <AlertTriangle className="w-4 h-4" /> {error}
                </div>
            )}
            {success && (
                <div className="bg-green-900/20 border border-green-900/50 p-3 rounded flex items-center gap-2 text-green-400 text-xs">
                    <Check className="w-4 h-4" /> {success}
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Nome de Usuário</label>
                    <div className="relative">
                        <UserIcon className="w-4 h-4 text-zinc-600 absolute left-3 top-2.5" />
                        <Input 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            className="pl-9 bg-black border-zinc-800 focus:border-ordem-purple"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Avatar (URL)</label>
                    <div className="relative">
                        <ImageIcon className="w-4 h-4 text-zinc-600 absolute left-3 top-2.5" />
                        <Input 
                            value={avatarUrl} 
                            onChange={e => setAvatarUrl(e.target.value)} 
                            placeholder="https://..."
                            className="pl-9 bg-black border-zinc-800 focus:border-ordem-purple"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">E-mail</label>
                    <div className="relative">
                        <Mail className="w-4 h-4 text-zinc-600 absolute left-3 top-2.5" />
                        <Input 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            placeholder="seu@email.com"
                            className="pl-9 bg-black border-zinc-800 focus:border-ordem-purple"
                        />
                    </div>
                    <p className="text-[9px] text-zinc-600 mt-1">*Alterar o e-mail pode exigir nova verificação.</p>
                </div>

                <div className="border-t border-zinc-800 pt-4 mt-4">
                    <label className="text-[10px] uppercase font-bold text-ordem-blood mb-2 block flex items-center gap-2"><Lock className="w-3 h-3"/> Alterar Senha (Opcional)</label>
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            type="password"
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            placeholder="Nova Senha"
                            className="bg-black border-zinc-800 focus:border-ordem-blood"
                        />
                        <Input 
                            type="password"
                            value={confirmPassword} 
                            onChange={e => setConfirmPassword(e.target.value)} 
                            placeholder="Confirmar"
                            className="bg-black border-zinc-800 focus:border-ordem-blood"
                        />
                    </div>
                </div>
            </div>

            <Button 
                onClick={handleUpdateProfile} 
                disabled={loading} 
                className="w-full bg-ordem-purple hover:bg-ordem-purple/80 text-white font-bold py-3"
            >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
        </div>
      </div>
    </div>
  );
};
