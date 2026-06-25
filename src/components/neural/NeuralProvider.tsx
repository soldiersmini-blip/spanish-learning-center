import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import NeuralDrawer from './NeuralDrawer';

type NeuralContextValue = {
  activeNodeId: string | null;
  openNode: (nodeId: string) => void;
  close: () => void;
};

const NeuralContext = createContext<NeuralContextValue | null>(null);
type NeuralPanelHistoryState = { neuralPanelOpen?: boolean };

interface Props {
  children: ReactNode;
  routeKey?: string;
}

export default function NeuralProvider({ children, routeKey }: Props) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const closePanel = () => {
    const state = window.history.state as NeuralPanelHistoryState | null;
    if (state?.neuralPanelOpen) {
      window.history.back();
      return;
    }
    setActiveNodeId(null);
  };

  const value = useMemo<NeuralContextValue>(() => ({
    activeNodeId,
    openNode: (nodeId: string) => setActiveNodeId((current) => {
      const state = window.history.state as NeuralPanelHistoryState | null;
      if (current === nodeId) {
        if (state?.neuralPanelOpen) {
          window.history.back();
          return current;
        }
        return null;
      }

      if (!current && !state?.neuralPanelOpen) {
        window.history.pushState({ ...(window.history.state || {}), neuralPanelOpen: true }, '', `${window.location.pathname}${window.location.search}${window.location.hash}`);
      }

      return nodeId;
    }),
    close: closePanel,
  }), [activeNodeId]);

  useEffect(() => {
    function handlePopState() {
      const state = window.history.state as NeuralPanelHistoryState | null;
      if (!state?.neuralPanelOpen) setActiveNodeId(null);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
