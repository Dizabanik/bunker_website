import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'accent' | 'active';
  active?: boolean;
  disabled?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, variant = 'default', active, disabled }) => {
  const baseStyles = "glass-panel rounded-xl p-4 transition-all duration-500 relative overflow-hidden";
  
  const variants = {
    default: "hover:border-white/20 hover:bg-white/5",
    danger: "border-bunker-danger/30 bg-bunker-danger/5",
    accent: "border-bunker-accent/30 bg-bunker-accent/5",
    active: "border-bunker-accent bg-bunker-accent/10 shadow-[0_0_30px_rgba(234,179,8,0.15)] transform scale-[1.00]"
  };

  const finalVariant = active ? 'active' : variant;

  return (
    <div 
      className={`
        ${baseStyles} 
        ${variants[finalVariant]} 
        ${className} 
        ${(onClick && !disabled) ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}
      `}
      onClick={!disabled ? onClick : undefined}
    >
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}></div>

      {active && (
        <div className="absolute inset-0 border border-bunker-accent/50 rounded-xl animate-pulse pointer-events-none shadow-[inset_0_0_20px_rgba(234,179,8,0.1)]"></div>
      )}
      
      {children}
    </div>
  );
};