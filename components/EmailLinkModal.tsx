import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Mail, AlertTriangle } from 'lucide-react';
import { dbService } from '../services/dbService';

interface EmailLinkModalProps {
  userId: string;
  onSuccess: (email: string) => void;
  onSkip: () => void;
}

export const EmailLinkModal: React.FC<EmailLinkModalProps> = ({ userId, onSuccess, onSkip }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await dbService.linkAccount(userId, email, password);
      onSuccess(email);
    } catch (err: any) {
      setError(err.message || 'Erro ao vincular e-mail.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-ordem-panel border border-ordem-border rounded-lg p-6 shadow-2xl relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ordem-purple to-transparent opacity-50"></div>
        
        <div className="flex items-center gap-3 mb-6 text-ordem-purple">
          <Mail size={24} />
          <h2 className="text-xl font-title font-bold text-white">Vincular E-mail</h2>
        </div>

        <p className="text-gray-400 mb-6 text-sm">
          Sua conta não possui um e-mail vinculado. Para garantir a recuperação de acesso em caso de perda de senha, por favor, adicione um e-mail válido.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">E-mail</label>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="seu@email.com"
              required
              className="bg-ordem-dark border-ordem-border"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Senha Atual</label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Sua senha para confirmar"
              required
              className="bg-ordem-dark border-ordem-border"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onSkip}
              className="flex-1 border-gray-700 text-gray-400 hover:text-white"
            >
              Fazer depois
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-ordem-purple hover:bg-ordem-purple/80 text-white"
            >
              {loading ? 'Enviando...' : 'Vincular e Verificar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
