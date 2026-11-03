import { createContext, useContext, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'anomaly-monitor-active-datasets';

type ActiveDatasetSelection = { mode: 'all' } | { mode: 'selected'; ids: string[] };

interface ActiveDatasetContextValue {
  selection: ActiveDatasetSelection;
  setAll: () => void;
  setSelected: (ids: string[]) => void;
  activeIds: string[] | null;
  label: string;
}

const ActiveDatasetContext = createContext<ActiveDatasetContextValue | null>(null);

function loadSelection(): ActiveDatasetSelection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ActiveDatasetSelection;
      if (parsed.mode === 'all' || parsed.mode === 'selected') return parsed;
    }
  } catch {
    // Ignore malformed storage.
  }
  return { mode: 'all' };
}

function saveSelection(selection: ActiveDatasetSelection) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Storage may be unavailable in some contexts.
  }
}

export function ActiveDatasetProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<ActiveDatasetSelection>(() => loadSelection());

  const update = (next: ActiveDatasetSelection) => {
    setSelection(next);
    saveSelection(next);
  };

  const setAll = () => update({ mode: 'all' });
  const setSelected = (ids: string[]) => update({ mode: 'selected', ids });

  const activeIds = selection.mode === 'all' ? null : selection.ids;
  const label = selection.mode === 'all' ? 'All' : `${selection.ids.length} selected`;

  return (
    <ActiveDatasetContext.Provider value={{ selection, setAll, setSelected, activeIds, label }}>
      {children}
    </ActiveDatasetContext.Provider>
  );
}

export function useActiveDatasets() {
  const ctx = useContext(ActiveDatasetContext);
  if (!ctx) throw new Error('useActiveDatasets must be used within ActiveDatasetProvider');
  return ctx;
}
