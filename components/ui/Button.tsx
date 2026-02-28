import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  isLoading,
  disabled,
  type = "button",
  ...props 
}) => {
  // Styles inspired by futuristic UI / Paranormal devices
  const baseStyle = "relative px-6 py-2 font-title font-bold uppercase tracking-widest text-sm transition-all duration-300 clip-path-slant group overflow-hidden focus:outline-none flex-shrink-0";
  
  // Define variants
  const variants = {
    primary: "bg-ordem-purple text-white border border-ordem-purple hover:bg-violet-900 hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-transparent text-ordem-green border border-ordem-green/50 hover:bg-ordem-green/10 hover:border-ordem-green hover:shadow-[0_0_15px_rgba(0,255,157,0.2)]",
    danger: "bg-transparent text-ordem-blood border border-ordem-blood hover:bg-ordem-blood/20 hover:shadow-[0_0_20px_rgba(183,0,44,0.4)]",
    ghost: "bg-transparent text-ordem-muted hover:text-white hover:bg-white/5",
  };

  return (
    <button 
      type={type}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Button Glitch Effect Overlay - Pointer Events None to prevent click blocking */}
      <span className="absolute inset-0 w-full h-full bg-white/5 transform -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out pointer-events-none"></span>
      
      {/* Content wrapper with z-index to stay above effects */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="animate-pulse">SINCRONIZANDO...</span>
          </>
        ) : children}
      </span>
    </button>
  );
};