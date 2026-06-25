import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import NeuralDrawer from './NeuralDrawer';

type NeuralContextValue = {
  activeNodeId: string | null;
  openNode: (nodeId: string) => void;
  close: () => void;
};

const NeuralContext = createContext<NeuralContextValue | null>(null);

interface Props {
  children: ReactNode;
  routeKey?: string;
}

export default function NeuralProvider({ children, routeKey }: Props) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const value = useMemo<NeuralContextValue>(() => ({
    activeNodeId,
    openNode: (nodeId: string) => setActiveNodeId((current) => (current === nodeId ? null : nodeId)),
    close: () => setActiveNodeId(null),
  }), [activeNodeId]);

  useEffect(() => {
    setActiveNodeId(null);
  }, [routeKey]);

  return (
    <NeuralContext.Provider value={value}>
      <div className={activeNodeId ? 'transition-[padding] duration-300 xl:pr-[400px] 2xl:pr-[440px]' : 'transition-[padding] duration-300'}>
        {children}
      </div>
      <NeuralDrawer nodeId={activeNodeId} onClose={value.close} />
    </NeuralContext.Provider>
  );
}

export function useNeural() {
  const context = useContext(NeuralContext);
  if (!context) throw new Error('useNeural must be used inside NeuralProvider');
  return context;
}
