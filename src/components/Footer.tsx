import BrandLogo from './BrandLogo';

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white/70 px-5 py-10 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mx-auto flex max-w-7xl flex-col items-center text-center">
        <BrandLogo size="medium" className="mb-4 justify-center" />
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">西班牙语学习中心</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Spanish Learning Center</p>
        <p className="mt-4 text-sm font-semibold tracking-[0.18em] text-coral-600 dark:text-coral-100">A1 · A2 · B1 · B2</p>
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          Version {__APP_VERSION__} · Build {__BUILD_COMMIT__}
        </p>
      </div>
    </footer>
  );
}
