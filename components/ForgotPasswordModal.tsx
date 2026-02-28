import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { KeyRound, AlertTriangle, ArrowLeft } from 'lucide-react';
import { dbService } from '../services/dbService';

interface ForgotPasswordModalProps {
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await dbService.requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar redefinição.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-ordem-panel border border-ordem-border rounded-lg p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-ordem-green/10 rounded-full flex items-center justify-center mx-auto mb-4 text-ordem-green">
            <KeyRound size={32} />
          </div>
          <h2 className="text-xl font-title font-bold text-white mb-2">E-mail Enviado</h2>
          <p className="text-gray-400 mb-6 text-sm">
            Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
          </p>
          <Button onClick={onClose} className="w-full bg-ordem-border hover:bg-gray-700 text-white">
            Voltar ao Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-ordem-panel border border-ordem-border rounded-lg p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 left-4 text-gray-500 hover:text-white">
          <ArrowLeft size={20} />
        </button>

        <div className="flex flex-col items-center gap-2 mb-6 mt-2">
          <div className="p-3 bg-ordem-purple/10 rounded-full text-ordem-purple">
            <KeyRound size={24} />
          </div>
          <h2 className="text-xl font-title font-bold text-white">Redefinir Senha</h2>
        </div>

        <p className="text-gray-400 mb-6 text-sm text-center">
          Insira seu e-mail vinculado para receber um link de redefinição de senha.
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

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-ordem-purple hover:bg-ordem-purple/80 text-white mt-2"
          >
            {loading ? 'Enviando...' : 'Enviar Link'}
          </Button>
        </form>
      </div>
    </div>
  );
};
