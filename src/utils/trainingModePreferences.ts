import type { EnabledTrainingMode, TrainingMode } from '../types/training';

export const TRAINING_MODE_PREFERENCES_KEY = 'spanish-learning-center:training-mode-preferences:v1';
export const TRAINING_MODE_PREFERENCES_VERSION = 1;

export const DEFAULT_TRAINING_MODES: EnabledTrainingMode[] = [
  'word-recognition',
  'sentence-fill-choice',
  'typing',
];

export const ENABLED_TRAINING_MODE_IDS: EnabledTrainingMode[] = [
  'word-recognition',
  'sentence-fill-choice',
  'typing',
];

export type TrainingModePreferences = {
  version: 1;
  selectedModes: TrainingMode[];
  updatedAt: string;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isEnabledTrainingMode(value: unknown): value is EnabledTrainingMode {
  return typeof value === 'string' && ENABLED_TRAINING_MODE_IDS.includes(value as EnabledTrainingMode);
}

export function validateTrainingModes(value: unknown, fallback: EnabledTrainingMode[] = DEFAULT_TRAINING_MODES) {
  if (!Array.isArray(value)) return [...fallback];
  const valid = value.filter(isEnabledTrainingMode);
  const unique = Array.from(new Set(valid));
  return unique.length > 0 ? unique : [...fallback];
}

export function readTrainingModePreferences(
  storage: StorageLike | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
  fallback: EnabledTrainingMode[] = DEFAULT_TRAINING_MODES,
) {
  if (!storage) return [...fallback];

  try {
    const raw = storage.getItem(TRAINING_MODE_PREFERENCES_KEY);
    if (!raw) return [...fallback];
    const parsed = JSON.parse(raw) as Partial<TrainingModePreferences>;
    if (parsed.version !== TRAINING_MODE_PREFERENCES_VERSION) return [...fallback];
    return validateTrainingModes(parsed.selectedModes, fallback);
  } catch {
    return [...fallback];
  }
}

export function saveTrainingModePreferences(
  selectedModes: EnabledTrainingMode[],
  storage: StorageLike | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
  now: Date = new Date(),
) {
  const validModes = validateTrainingModes(selectedModes);
  if (!storage) return validModes;

  const payload: TrainingModePreferences = {
    version: TRAINING_MODE_PREFERENCES_VERSION,
    selectedModes: validModes,
    updatedAt: now.toISOString(),
  };
  storage.setItem(TRAINING_MODE_PREFERENCES_KEY, JSON.stringify(payload));
  return validModes;
}
