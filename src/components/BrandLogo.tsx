type BrandLogoSize = 'small' | 'medium' | 'large';
type BrandLogoVariant = 'circle' | 'hero';

interface Props {
  size?: BrandLogoSize;
  variant?: BrandLogoVariant;
  showText?: boolean;
  subtitle?: string;
  className?: string;
  animated?: boolean;
}

const circleSizeClasses: Record<BrandLogoSize, string> = {
  small: 'h-10 w-10 sm:h-12 sm:w-12',
  medium: 'h-16 w-16 sm:h-20 sm:w-20',
  large: 'h-28 w-28 sm:h-36 sm:w-36 lg:h-48 lg:w-48',
};

const heroSizeClasses: Record<BrandLogoSize, string> = {
  small: 'w-28 sm:w-36',
  medium: 'w-40 sm:w-52',
  large: 'w-48 sm:w-60 lg:w-72',
};

export default function BrandLogo({
  size = 'medium',
  variant = 'circle',
  showText = false,
  subtitle,
  className = '',
  animated = true,
}: Props) {
  const isHero = variant === 'hero';
  const baseUrl = import.meta.env.BASE_URL || '/';
  const src = `${baseUrl}${isHero ? 'icons/brand-logo.svg' : 'icons/spanish-icon.png'}`;
  const imageClass = isHero
    ? `${heroSizeClasses[size]} h-auto shrink-0 object-contain`
    : `${circleSizeClasses[size]} shrink-0 rounded-full object-contain transition duration-300 hover:scale-105`;

  return (
    <div className={`${animated ? 'brand-fade' : ''} flex items-center gap-3 ${className}`}>
      <img src={src} alt="西班牙语学习中心 Logo" className={imageClass} />
      {showText && (
        <span className="min-w-0">
          <span className="block font-bold leading-tight text-slate-950 dark:text-white">西班牙语学习中心</span>
          {subtitle && <span className="mt-1 block text-sm text-slate-500 dark:text-slate-300">{subtitle}</span>}
        </span>
      )}
    </div>
  );
}
