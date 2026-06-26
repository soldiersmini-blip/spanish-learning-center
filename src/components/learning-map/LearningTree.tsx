import type { Locale } from '../../types';
import type { LearningMapViewState, LearningNode } from '../../types/learningMap';
import LearningTreeNode from './LearningTreeNode';

interface Props {
  nodes: LearningNode[];
  locale: Locale;
  state: LearningMapViewState;
  selectedNodeId: string;
  onToggleExpanded: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  onCycleStatus: (nodeId: string) => void;
  onHide: (nodeId: string) => void;
  onRestore: (nodeId: string) => void;
}

export default function LearningTree(props: Props) {
  return (
    <ul className="space-y-2">
      {props.nodes.map((node) => (
        <LearningTreeNode
          key={node.id}
          node={node}
          depth={0}
          locale={props.locale}
          state={props.state}
          selectedNodeId={props.selectedNodeId}
          onToggleExpanded={props.onToggleExpanded}
          onSelect={props.onSelect}
          onCycleStatus={props.onCycleStatus}
          onHide={props.onHide}
          onRestore={props.onRestore}
        />
      ))}
    </ul>
  );
}
