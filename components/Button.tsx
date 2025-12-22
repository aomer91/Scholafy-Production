import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-scholafy-accent text-scholafy-panel hover:bg-yellow-400 border border-transparent shadow-lg shadow-yellow-900/20",
    secondary: "bg-scholafy-card text-white hover:bg-slate-700 border border-scholafy-border",
    outline: "bg-transparent border-2 border-scholafy-muted text-scholafy-muted hover:border-white hover:text-white",
    danger: "bg-scholafy-error/10 text-scholafy-error border border-scholafy-error hover:bg-scholafy-error hover:text-white"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
