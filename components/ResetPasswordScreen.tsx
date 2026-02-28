import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { dbService } from '../services/dbService';

interface ResetPasswordScreenProps {
  onSuccess: () => void;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await dbService.updatePassword(password);
      setSuccess(true);
      setTimeout(onSuccess, 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="w-full max-w-md bg-ordem-panel border border-ordem-border rounded-lg p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-ordem-green/10 rounded-full flex items-center justify-center mx-auto mb-4 text-ordem-green">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-xl font-title font-bold text-white mb-2">Senha Alterada!</h2>
          <p className="text-gray-400 mb-6 text-sm">
            Sua senha foi redefinida com sucesso. Redirecionando para o login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md bg-ordem-panel border border-ordem-border rounded-lg p-6 shadow-2xl relative">
        <div className="flex flex-col items-center gap-2 mb-6 mt-2">
          <div className="p-3 bg-ordem-purple/10 rounded-full text-ordem-purple">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-title font-bold text-white">Nova Senha</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Nova Senha</label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••"
              required
              className="bg-ordem-dark border-ordem-border"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Confirmar Senha</label>
            <Input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="••••••"
              required
              className="bg-ordem-dark border-ordem-border"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-ordem-purple hover:bg-ordem-purple/80 text-white mt-2"
          >
            {loading ? 'Redefinir Senha' : 'Salvar Nova Senha'}
          </Button>
        </form>
      </div>
    </div>
  );
};
