// ─── UI store (map sheet, selected station, filters) ──────────────────────
import { create } from 'zustand';
import { DEFAULT_FILTERS, StationFilters, StationSortKey } from '@/types';

interface UiState {
  filters: StationFilters;
  sortKey: StationSortKey;
  selectedStationId: string | null;
  sheetOpen: boolean;
  setFilter: <K extends keyof StationFilters>(key: K, value: StationFilters[K]) => void;
  resetFilters: () => void;
  setSortKey: (k: StationSortKey) => void;
  selectStation: (id: string | null) => void;
  setSheetOpen: (open: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  filters: { ...DEFAULT_FILTERS },
  sortKey: 'netSavings',
  selectedStationId: null,
  sheetOpen: true,
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
  setSortKey: (sortKey) => set({ sortKey }),
  selectStation: (selectedStationId) => set({ selectedStationId }),
  setSheetOpen: (sheetOpen) => set({ sheetOpen }),
}));
