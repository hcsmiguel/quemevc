import type { SavedDeck, SavedFace } from './auth';

export type CommunitySourceFilter = 'todos' | 'tanacara' | 'comunidade' | 'salvos';

export interface CommunityCachedState {
  scrollPosition: number;
  activeTab: 'decks' | 'faces';
  sourceFilter: CommunitySourceFilter | 'oficiais';
  sortOrder: 'recentes' | 'salvas' | 'az';
  searchQuery: string;
  allDecks?: SavedDeck[];
  allFaces?: SavedFace[];
}

let cachedState: CommunityCachedState | null = null;

export const communityCache = {
  saveState(state: Partial<CommunityCachedState>): void {
    cachedState = {
      scrollPosition: state.scrollPosition ?? cachedState?.scrollPosition ?? 0,
      activeTab: state.activeTab ?? cachedState?.activeTab ?? 'decks',
      sourceFilter: state.sourceFilter ?? cachedState?.sourceFilter ?? 'todos',
      sortOrder: state.sortOrder ?? cachedState?.sortOrder ?? 'recentes',
      searchQuery: state.searchQuery ?? cachedState?.searchQuery ?? '',
      allDecks: state.allDecks ?? cachedState?.allDecks,
      allFaces: state.allFaces ?? cachedState?.allFaces,
    };
  },

  getState(): CommunityCachedState | null {
    return cachedState;
  },

  saveScroll(scrollY: number): void {
    if (cachedState) {
      cachedState.scrollPosition = scrollY;
    } else {
      cachedState = {
        scrollPosition: scrollY,
        activeTab: 'decks',
        sourceFilter: 'todos',
        sortOrder: 'recentes',
        searchQuery: '',
      };
    }
  },

  getScroll(): number {
    return cachedState?.scrollPosition || 0;
  },

  clear(): void {
    cachedState = null;
  },
};
