
export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div className={`inline-flex p-1 bg-[#E2DACD]/40 rounded-[8px] gap-1 border border-[#E2DACD] ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-sans font-medium rounded-[5px] transition-all cursor-pointer ${
              active
                ? 'bg-[#2B2420] text-white shadow-2xs font-semibold'
                : 'text-[#6F655C] hover:text-[#2B2420] bg-transparent'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
