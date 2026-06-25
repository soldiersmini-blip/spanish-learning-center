import { useEffect, useMemo, useState } from 'react';
import type { VocabItem } from '../types';
import type { TrainingAnswerResult, TrainingQuestion, TrainingSettings } from '../types/training';
import type { VocabTestLevel, VocabTestRecord } from '../types/vocabTest';
import TestHeader from '../components/test/TestHeader';
import TestResult from '../components/test/TestResult';
import TrainingCenter from '../components/training/TrainingCenter';
import TrainingQuestionCard from '../components/training/TrainingQuestionCard';
import {
  buildTrainingQuestions,
  checkTypingAnswer,
  defaultTrainingSettings,
  getWrongWordIds,
} from '../utils/TrainingEngine';
import {
  readTrainingModePreferences,
  saveTrainingModePreferences,
} from '../utils/trainingModePreferences';
import {
  createVocabTestRecord,
  getBestAccuracy,
  readVocabTestRecords,
  saveVocabTestRecord,
} from '../utils/vocabTest';
import { warnVocabularyIssuesInDev } from '../utils/validateVocabulary';

interface Props {
  level: VocabTestLevel;
  words: VocabItem[];
  initialQuestionCount: number;
  onExit: () => void;
}

const wrongKey = (level: VocabTestLevel) => `spanish-vocab-training-wrong-${level}`;

export default function VocabularyTestPage({ level, words, initialQuestionCount, onExit }: Props) {
  const [records, setRecords] = useState<VocabTestRecord[]>(() => readVocabTestRecords(level));
  const [settings, setSettings] = useState<TrainingSettings>(() => ({
    ...defaultTrainingSettings,
    modes: readTrainingModePreferences(),
    questionCount: [20, 50, 100, 200].includes(initialQuestionCount) ? initialQuestionCount as TrainingSettings['questionCount'] : 20,
  }));
  const [questions, setQuestions] = useState<TrainingQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<TrainingAnswerResult | undefined>>([]);
  const [typedInput, setTypedInput] = useState('');
  const [finalRecord, setFinalRecord] = useState<VocabTestRecord | null>(null);
  const [wrongWordIds, setWrongWordIds] = useState<string[]>(() => readWrongIds(level));

  useEffect(() => {
    setRecords(readVocabTestRecords(level));
    setWrongWordIds(readWrongIds(level));
    warnVocabularyIssuesInDev(level, words);
    setQuestions([]);
    setAnswers([]);
    setFinalRecord(null);
    setCurrentIndex(0);
  }, [level, words]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex];
  const selectedAnswer = currentAnswer?.selectedAnswer ?? null;
  const typedAnswer = currentAnswer?.typedAnswer ?? typedInput;
  const unknown = currentAnswer?.unknown ?? false;
  const accentWarning = currentAnswer?.accentWarning ?? false;
  const sourceWord = currentQuestion ? words.find((word) => word.id === currentQuestion.sourceWordId) : undefined;
  const wrongResults = answers.filter((item): item is TrainingAnswerResult => Boolean(item && !item.correct));
  const stats = useMemo(() => getTodayStats(records), [records]);

  function startTraining(nextSettings = settings) {
    const nextQuestions = buildTrainingQuestions(words, nextSettings, wrongWordIds);
    setSettings(nextSettings);
    setQuestions(nextQuestions);
    setCurrentIndex(0);
    setAnswers([]);
    setTypedInput('');
    setFinalRecord(null);
  }

  function updateSettings(nextSettings: TrainingSettings) {
    const modesChanged = nextSettings.modes.join('|') !== settings.modes.join('|');
    if (modesChanged) {
      const savedModes = saveTrainingModePreferences(nextSettings.modes);
      setSettings({ ...nextSettings, modes: savedModes });
      return;
    }
    setSettings(nextSettings);
  }

  function selectCount(count: number) {
    const nextSettings = { ...settings, questionCount: count as TrainingSettings['questionCount'] };
    startTraining(nextSettings);
  }

  function restart() {
    startTraining(settings);
  }

  function commitAnswer(answer: string | null, isUnknown = false, typed?: string, accent = false) {
    if (!currentQuestion || answers[currentIndex]) return;
    const correct = !isUnknown && answer === currentQuestion.answer;
    setAnswers((current) => {
      const next = [...current];
      next[currentIndex] = {
        question: currentQuestion,
        selectedAnswer: answer,
        typedAnswer: typed,
        correct,
        unknown: isUnknown,
        accentWarning: accent,
      };
      return next;
    });
  }

  function submitTyping() {
    if (!currentQuestion || currentQuestion.mode !== 'typing' || answers[currentIndex]) return;
    const result = checkTypingAnswer(typedInput, currentQuestion.answer);
    commitAnswer(result.correct ? currentQuestion.answer : typedInput.trim(), false, typedInput.trim(), result.accentWarning);
  }

  function goPrevious() {
    setCurrentIndex((index) => Math.max(0, index - 1));
    setTypedInput('');
  }

  function goNext() {
    if (!answers[currentIndex]) return;
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((index) => index + 1);
      setTypedInput('');
      return;
    }

    const completed = answers.filter((item): item is TrainingAnswerResult => Boolean(item));
    const correctCount = completed.filter((item) => item.correct).length;
    const record = createVocabTestRecord(level, words.length, questions.length, correctCount);
    const savedRecords = saveVocabTestRecord(record);
    const nextWrongIds = mergeWrongIds(wrongWordIds, getWrongWordIds(completed));
    saveWrongIds(level, nextWrongIds);
    setWrongWordIds(nextWrongIds);
    setRecords(savedRecords);
    setFinalRecord(record);
  }

  function practiceWrong() {
    const nextSettings: TrainingSettings = {
      ...settings,
      scope: 'wrong',
      questionCount: Math.min(settings.questionCount, Math.max(20, wrongWordIds.length)) as TrainingSettings['questionCount'],
    };
    startTraining(nextSettings);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (questions.length > 0) {
          setQuestions([]);
          setFinalRecord(null);
          return;
        }
        onExit();
        return;
      }
      if (!currentQuestion || finalRecord) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (['1', '2', '3', '4'].includes(event.key) && currentQuestion.options && !answers[currentIndex]) {
        const option = currentQuestion.options[Number(event.key) - 1];
        if (option) commitAnswer(option);
        return;
      }
      if (event.key === 'ArrowLeft') {
        goPrevious();
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        goNext();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answers, currentIndex, currentQuestion, finalRecord, questions.length, onExit]);

  if (finalRecord) {
    return (
      <div className="min-h-screen bg-paper dark:bg-slate-950">
        <TestHeader
          level={level}
          questionCount={settings.questionCount}
          todayQuestions={stats.todayQuestions}
          todayAccuracy={stats.todayAccuracy}
          streakDays={stats.streakDays}
          wrongCount={wrongWordIds.length}
          onExit={() => setQuestions([])}
          onSelectCount={selectCount}
          onRestart={restart}
          onWrongOnly={practiceWrong}
        />
        <TestResult
          record={finalRecord}
          bestAccuracy={getBestAccuracy(records)}
          totalWords={words.length}
          words={words}
          results={answers.filter((item): item is TrainingAnswerResult => Boolean(item))}
          onRestart={restart}
          onPracticeWrong={practiceWrong}
          onExit={() => {
            setQuestions([]);
            setFinalRecord(null);
          }}
        />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-paper dark:bg-slate-950">
        <TestHeader
          level={level}
          questionCount={settings.questionCount}
          todayQuestions={stats.todayQuestions}
          todayAccuracy={stats.todayAccuracy}
          streakDays={stats.streakDays}
          wrongCount={wrongWordIds.length}
          onExit={onExit}
          onSelectCount={(count) => setSettings((current) => ({ ...current, questionCount: count as TrainingSettings['questionCount'] }))}
          onRestart={() => startTraining(settings)}
          onWrongOnly={practiceWrong}
        />
        <TrainingCenter
          level={level}
          settings={settings}
          totalWords={words.length}
          wrongCount={wrongWordIds.length}
          onChange={updateSettings}
          onStart={() => startTraining(settings)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-slate-950">
      <TestHeader
        level={level}
        questionCount={settings.questionCount}
        todayQuestions={stats.todayQuestions}
        todayAccuracy={stats.todayAccuracy}
        streakDays={stats.streakDays}
        wrongCount={wrongWordIds.length}
        onExit={() => setQuestions([])}
        onSelectCount={selectCount}
        onRestart={restart}
        onWrongOnly={practiceWrong}
      />
      <main className="mx-auto flex w-full max-w-6xl justify-center px-5 py-8 sm:py-12">
        <TrainingQuestionCard
          question={currentQuestion}
          questionIndex={currentIndex}
          totalQuestions={questions.length}
          sourceWord={sourceWord}
          selectedAnswer={selectedAnswer}
          typedAnswer={typedAnswer}
          unknown={unknown}
          accentWarning={accentWarning}
          showExplanation={settings.showExplanation}
          showExample={settings.showExampleAfterAnswer}
          onAnswer={(answer) => commitAnswer(answer)}
          onTypingChange={setTypedInput}
          onTypingSubmit={submitTyping}
          onUnknown={() => commitAnswer(null, true)}
          onNext={goNext}
          onPrevious={goPrevious}
        />
      </main>
    </div>
  );
}

function getTodayStats(records: VocabTestRecord[]) {
  const todayKey = new Date().toDateString();
  const todayRecords = records.filter((record) => new Date(record.date).toDateString() === todayKey);
  const todayQuestions = todayRecords.reduce((sum, record) => sum + record.totalQuestions, 0);
  const todayCorrect = todayRecords.reduce((sum, record) => sum + record.correctCount, 0);
  const todayAccuracy = todayQuestions === 0 ? 0 : Math.round((todayCorrect / todayQuestions) * 100);
  const streakDays = countStreakDays(records);

  return { todayQuestions, todayAccuracy, streakDays };
}

function countStreakDays(records: VocabTestRecord[]) {
  const days = new Set(records.map((record) => new Date(record.date).toDateString()));
  let streak = 0;
  const cursor = new Date();

  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function readWrongIds(level: VocabTestLevel) {
  try {
    const saved = localStorage.getItem(wrongKey(level));
    return saved ? JSON.parse(saved) as string[] : [];
  } catch {
    return [];
  }
}

function saveWrongIds(level: VocabTestLevel, ids: string[]) {
  localStorage.setItem(wrongKey(level), JSON.stringify(ids.slice(0, 300)));
}

function mergeWrongIds(current: string[], next: string[]) {
  return Array.from(new Set([...next, ...current]));
}
