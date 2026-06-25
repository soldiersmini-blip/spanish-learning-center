type NeuralLearningProgress = {
  visitedNodeIds: string[];
  masteredNodeIds: string[];
  understoodLinkIds: string[];
  updatedAt: string;
};

const key = 'spanish-neural-learning-progress';
export const neuralProgressStorageKey = key;
export const neuralProgressUpdatedEvent = 'spanish-neural-progress-updated';

const emptyProgress = (): NeuralLearningProgress => ({
  visitedNodeIds: [],
  masteredNodeIds: [],
  understoodLinkIds: [],
  updatedAt: new Date().toISOString(),
});

export function readNeuralProgress(): NeuralLearningProgress {
  try {
    const saved = localStorage.getItem(key);
    return saved ? { ...emptyProgress(), ...JSON.parse(saved) } : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function saveNeuralProgress(progress: NeuralLearningProgress) {
  localStorage.setItem(key, JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }));
  window.dispatchEvent(new Event(neuralProgressUpdatedEvent));
}

export function markNodeVisited(nodeId: string) {
  const progress = readNeuralProgress();
  if (!progress.visitedNodeIds.includes(nodeId)) {
    progress.visitedNodeIds.push(nodeId);
    saveNeuralProgress(progress);
  }
}

export function toggleUnderstoodLink(linkId: string) {
  const progress = readNeuralProgress();
  progress.understoodLinkIds = progress.understoodLinkIds.includes(linkId)
    ? progress.understoodLinkIds.filter((id) => id !== linkId)
    : [...progress.understoodLinkIds, linkId];
  saveNeuralProgress(progress);
  return progress;
}
