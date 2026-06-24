import type { Conjugation } from '../types/grammar';

interface Props {
  conjugation: Conjugation;
}

export default function ConjugationTable({ conjugation }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h4 className="text-lg font-bold text-slate-950 dark:text-white">{conjugation.verb}</h4>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700 dark:bg-slate-800 dark:text-brand-100">
          {conjugation.tense}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="py-2 pr-3 font-semibold">人称</th>
              <th className="py-2 pr-3 font-semibold">变位</th>
              <th className="py-2 pr-3 font-semibold">实用例句</th>
              <th className="py-2 pr-3 font-semibold">中文</th>
              <th className="py-2 font-semibold">场景</th>
            </tr>
          </thead>
          <tbody>
            {conjugation.forms.map((form) => (
              <tr key={`${form.pronoun}-${form.form}-${form.example}`} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="py-3 pr-3 font-medium text-slate-700 dark:text-slate-200">{form.pronoun}</td>
                <td className="py-3 pr-3 font-bold text-brand-700 dark:text-brand-100">{form.form}</td>
                <td className="py-3 pr-3 text-slate-700 dark:text-slate-200">{form.example}</td>
                <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">{form.zh}</td>
                <td className="py-3 text-slate-500 dark:text-slate-400">{form.scene}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
