import { Map } from 'lucide-react';
import type { Locale, LocalizedText } from '../../types';
import { t } from '../../i18n';

interface Props {
  message?: LocalizedText;
  locale: Locale;
}

export default function LearningMapEmptyState({ message, locale }: Props) {
  const fallback = {
    zh: '当前级别的学习地图已经准备好，正式内容会继续接入。',
    en: 'The learning map shell is ready. Course content will be added later.',
    es: 'La estructura del mapa está lista. El contenido se añadirá más adelante.',
  };

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
      <Map className="mx-auto h-10 w-10 text-brand-600 dark:text-brand-100" />
      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t(message || fallback, locale)}</p>
    </div>
  );
}
