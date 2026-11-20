import { forwardRef, type InputHTMLAttributes } from 'react';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(({
  label,
  description,
  className = '',
  checked,
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? `rad-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <label htmlFor={inputId} className={`inline-flex items-start gap-2.5 cursor-pointer select-none group ${className}`}>
      <input
        ref={ref}
        type="radio"
        id={inputId}
        checked={checked}
        className="sr-only peer"
        {...props}
      />
      <div className="w-4 h-4 rounded-full border border-[#E2DACD] bg-[#FBF8F3] peer-checked:border-[#2B2420] flex items-center justify-center transition-colors shrink-0 mt-0.5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#2B2420] peer-focus-visible:ring-offset-1">
        {checked && <div className="w-2 h-2 rounded-full bg-[#2B2420]" />}
      </div>
      {(label || description) && (
        <div className="flex flex-col text-left">
          {label && <span className="text-sm font-sans font-medium text-[#2B2420]">{label}</span>}
          {description && <span className="text-xs font-sans text-[#6F655C]">{description}</span>}
        </div>
      )}
    </label>
  );
});

Radio.displayName = 'Radio';
