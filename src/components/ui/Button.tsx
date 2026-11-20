import { forwardRef, type ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center font-sans font-medium transition-colors cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#2B2420] focus-visible:ring-offset-2 motion-reduce:transition-none disabled:opacity-40 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'h-8 px-3 text-xs rounded-[6px]',
    md: 'h-10 px-4 text-sm rounded-[6px]',
    lg: 'h-12 px-5 text-base rounded-[6px]',
  };

  const variants = {
    primary: 'bg-[#B4532F] hover:bg-[#984323] text-white border-0 shadow-none',
    secondary: 'bg-transparent border border-[#2B2420] text-[#2B2420] hover:bg-[#2B2420]/5',
    text: 'bg-transparent text-[#6F655C] hover:text-[#2B2420] underline-offset-4 hover:underline p-0 h-auto',
    danger: 'bg-transparent text-[#8C2E2A] hover:bg-[#F8EBEA] border border-[#ECC7C5]',
  };

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`${base} ${variant !== 'text' ? sizes[size] : ''} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
