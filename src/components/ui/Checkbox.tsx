import { forwardRef, type InputHTMLAttributes } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  description,
  className = '',
  checked,
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? `chk-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <label htmlFor={inputId} className={`inline-flex items-start gap-2.5 cursor-pointer select-none group ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        id={inputId}
        checked={checked}
        className="sr-only peer"
        {...props}
      />
      <div className="w-4 h-4 rounded-[4px] border border-[#E2DACD] bg-[#FBF8F3] peer-checked:bg-[#2B2420] peer-checked:border-[#2B2420] flex items-center justify-center transition-colors shrink-0 mt-0.5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#2B2420] peer-focus-visible:ring-offset-1">
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2.5 6 5 8.5 9.5 3.5" />
          </svg>
        )}
      </div>
      {(label || description) && (
        <div className="flex flex-col text-left">
          {label && <span className="text-sm font-sans text-[#2B2420] group-hover:text-black">{label}</span>}
          {description && <span className="text-xs font-sans text-[#6F655C]">{description}</span>}
        </div>
      )}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';
