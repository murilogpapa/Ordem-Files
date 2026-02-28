import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', wrapperClassName = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-1 w-full group ${wrapperClassName}`}>
      {label && (
        <label className="text-[10px] uppercase tracking-[0.2em] text-ordem-muted font-bold group-focus-within:text-ordem-purple transition-colors font-tech">
          {label}
        </label>
      )}
      <input
        className={`bg-black/40 border-b border-ordem-border rounded-t px-3 py-2 text-ordem-text font-tech text-lg 
        focus:border-ordem-purple focus:ring-0 focus:bg-ordem-purple/5 focus:shadow-[0_4px_10px_-5px_rgba(124,58,237,0.3)]
        outline-none transition-all placeholder:text-zinc-800 placeholder:uppercase placeholder:text-xs ${className}`}
        {...props}
      />
      {error && <span className="text-ordem-blood text-xs font-bold font-mono tracking-wide glow-red">{error}</span>}
    </div>
  );
};

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full group">
      {label && (
        <label className="text-[10px] uppercase tracking-[0.2em] text-ordem-muted font-bold group-focus-within:text-ordem-green transition-colors font-tech">
          {label}
        </label>
      )}
      <textarea
        className={`bg-black/40 border-l-2 border-ordem-border px-4 py-2 text-ordem-text font-mono text-sm leading-relaxed
        focus:border-ordem-green focus:ring-0 focus:bg-ordem-green/5 
        outline-none transition-all placeholder:text-zinc-800 min-h-[100px] ${className}`}
        {...props}
      />
    </div>
  );
};