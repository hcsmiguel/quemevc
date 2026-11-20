
export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
}

export function Tabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  className = '',
}: TabsProps<T>) {
  return (
    <div className={`flex items-center gap-6 border-b border-[#E2DACD] ${className}`}>
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`pb-3 text-sm font-sans transition-colors cursor-pointer relative ${
              active
                ? 'text-[#2B2420] font-semibold'
                : 'text-[#6F655C] hover:text-[#2B2420] font-normal'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs text-[#6F655C]">({tab.count})</span>
            )}
            {active && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2B2420] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
