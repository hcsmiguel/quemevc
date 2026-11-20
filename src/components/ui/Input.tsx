import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className = '',
  error,
  ...props
}, ref) => {
  return (
    <input
      ref={ref}
      className={`w-full h-10 px-3 bg-[#FBF8F3] border ${
        error ? 'border-[#8C2E2A]' : 'border-[#E2DACD]'
      } focus:border-[#2B2420] text-[#2B2420] placeholder-[#A39A90] font-sans text-sm rounded-[6px] outline-none transition-colors ${className}`}
      {...props}
    />
  );
});

Input.displayName = 'Input';
