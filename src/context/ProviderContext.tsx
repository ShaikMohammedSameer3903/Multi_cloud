import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type ProviderType = 'aws' | 'azure' | 'all';

interface ProviderContextType {
  selectedProvider: ProviderType;
  setSelectedProvider: (provider: ProviderType) => void;
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined);

export function ProviderProvider({ children }: { children: ReactNode }) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('azure');

  return (
    <ProviderContext.Provider value={{ selectedProvider, setSelectedProvider }}>
      {children}
    </ProviderContext.Provider>
  );
}

export function useProvider() {
  const context = useContext(ProviderContext);
  if (context === undefined) {
    throw new Error('useProvider must be used within a ProviderProvider');
  }
  return context;
}
