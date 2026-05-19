import { useState, useEffect, useRef } from 'react';
import vanityLogo from '@/assets/vanity-box-logo-new.svg';

interface LoadingProgressProps {
  isLoading: boolean;
  title?: string;
  primaryLabel?: string | null;
  secondaryLabel?: string | null;
}

export const LoadingProgress = ({ isLoading, title, primaryLabel, secondaryLabel }: LoadingProgressProps) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      const hideTimer = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(hideTimer);
    }

    setVisible(true);
    setProgress(0);
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const targetProgress = Math.min(96, 96 * (1 - Math.exp(-elapsed / 450)));
      setProgress(Math.round(targetProgress));
      if (elapsed < 15000) {
        animationRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animationRef.current = requestAnimationFrame(updateProgress);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isLoading]);

  if (!visible) return null;

  const stages = [
    { label: 'Resolving identity', pct: 25 },
    { label: 'Linking chains', pct: 55 },
    { label: 'Fetching assets', pct: 80 },
    { label: 'Finalizing view', pct: 95 },
  ];
  const currentStage = stages.findIndex(s => progress < s.pct);
  const activeStage = currentStage === -1 ? stages.length - 1 : currentStage;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-lg animate-fade-in">
      {/* Gold ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#D4AF37]/10 blur-3xl animate-pulse" />
      </div>

      <div className="relative mx-4 w-full max-w-md rounded-3xl border border-[#D4AF37]/40 bg-background/95 p-7 shadow-2xl shadow-[#D4AF37]/20">
        {/* Animated gold border shimmer */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-60"
          style={{
            background:
              'linear-gradient(120deg, transparent 30%, rgba(212,175,55,0.35) 50%, transparent 70%)',
            backgroundSize: '200% 100%',
            animation: 'shimmerSlide 2.4s linear infinite',
            WebkitMask:
              'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: 1,
            borderRadius: '1.5rem',
          }}
        />

        <style>{`
          @keyframes shimmerSlide { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
          @keyframes logoPulse { 0%,100%{transform:scale(1);filter:drop-shadow(0 0 12px rgba(212,175,55,0.5))} 50%{transform:scale(1.05);filter:drop-shadow(0 0 24px rgba(212,175,55,0.85))} }
        `}</style>

        <div className="relative space-y-5">
          {/* Animated logo */}
          <div className="flex flex-col items-center gap-3">
            <img
              src={vanityLogo}
              alt="Vanity"
              className="h-16 w-16"
              style={{ animation: 'logoPulse 1.6s ease-in-out infinite' }}
            />
            <div className="space-y-1 text-center">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                {title || (secondaryLabel ? 'Loading linked profile' : 'Loading profile')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {secondaryLabel ? 'Blending searched identity with linked chain data' : 'Fetching the latest profile data'}
              </p>
            </div>
          </div>

          {(primaryLabel || secondaryLabel) && (
            <div className="flex flex-col items-center gap-1.5">
              {primaryLabel && (
                <div className="max-w-full truncate px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-medium">
                  {primaryLabel}
                </div>
              )}
              {secondaryLabel && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>linked to</span>
                  <span className="max-w-full truncate px-2 py-0.5 rounded-full bg-muted text-foreground/80">{secondaryLabel}</span>
                </div>
              )}
            </div>
          )}

          {/* Gold progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
              <span>{stages[activeStage].label}</span>
              <span className="font-mono text-[#D4AF37]">{Math.max(5, progress)}%</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
                style={{
                  width: `${Math.max(5, progress)}%`,
                  background: 'linear-gradient(90deg, #B8860B, #D4AF37, #F0D78C, #D4AF37)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmerSlide 1.8s linear infinite',
                  boxShadow: '0 0 12px rgba(212,175,55,0.6)',
                }}
              />
            </div>
          </div>

          {/* Stage pips */}
          <div className="grid grid-cols-4 gap-1.5">
            {stages.map((s, i) => (
              <div
                key={s.label}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i <= activeStage ? 'bg-[#D4AF37]' : 'bg-muted'
                }`}
                style={i <= activeStage ? { boxShadow: '0 0 6px rgba(212,175,55,0.7)' } : undefined}
              />
            ))}
          </div>

          {/* Skeleton preview */}
          <div className="space-y-2 pt-1">
            <div className="h-2 rounded-full bg-muted/60 overflow-hidden relative">
              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)', backgroundSize: '200% 100%', animation: 'shimmerSlide 1.8s linear infinite' }} />
            </div>
            <div className="h-2 w-3/4 rounded-full bg-muted/60 overflow-hidden relative">
              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)', backgroundSize: '200% 100%', animation: 'shimmerSlide 1.8s linear infinite' }} />
            </div>
            <div className="h-2 w-1/2 rounded-full bg-muted/60 overflow-hidden relative">
              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)', backgroundSize: '200% 100%', animation: 'shimmerSlide 1.8s linear infinite' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
