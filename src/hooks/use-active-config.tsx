import { createContext, useContext, useState, type ReactNode } from 'react';
import { DEFAULT_CONFIG, type AnomalyConfig } from '@/types/domain';

interface ActiveConfigContextValue {
  config: AnomalyConfig;
  setConfig: (config: AnomalyConfig) => void;
  activeName: string | null;
  setActiveName: (name: string | null) => void;
}

const ActiveConfigContext = createContext<ActiveConfigContextValue | null>(null);

export function ActiveConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AnomalyConfig>(DEFAULT_CONFIG);
  const [activeName, setActiveName] = useState<string | null>(null);

  return (
    <ActiveConfigContext.Provider value={{ config, setConfig, activeName, setActiveName }}>
      {children}
    </ActiveConfigContext.Provider>
  );
}

export function useActiveConfig() {
  const ctx = useContext(ActiveConfigContext);
  if (!ctx) throw new Error('useActiveConfig must be used within ActiveConfigProvider');
  return ctx;
}
