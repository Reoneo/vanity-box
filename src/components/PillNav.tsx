import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './PillNav.css';

interface PillNavItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
}

interface PillNavProps {
  items: PillNavItem[];
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
}

const PillNav = ({
  items,
  className = '',
  ease = 'power3.easeOut',
  baseColor = '#060010',
  pillColor = '#D4AF37',
  hoveredPillTextColor = '#060010',
  pillTextColor,
}: PillNavProps) => {
  const resolvedPillTextColor = pillTextColor ?? '#fff';
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRefs = useRef<gsap.core.Timeline[]>([]);
  const activeTweenRefs = useRef<gsap.core.Tween[]>([]);
  const navItemsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle, index) => {
        if (!circle?.parentElement) return;

        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`
        });

        const label = pill.querySelector('.pill-label') as HTMLElement;
        const white = pill.querySelector('.pill-label-hover') as HTMLElement;

        if (label) gsap.set(label, { y: 0 });
        if (white) gsap.set(white, { y: h + 12, opacity: 0 });

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });

        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: 'auto' }, 0);

        if (label) {
          tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: 'auto' }, 0);
        }

        if (white) {
          gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
          tl.to(white, { y: 0, opacity: 1, duration: 2, ease, overwrite: 'auto' }, 0);
        }

        tlRefs.current[index] = tl;
      });
    };

    layout();

    const onResize = () => layout();
    window.addEventListener('resize', onResize);

    if (document.fonts?.ready) {
      document.fonts.ready.then(layout).catch(() => {});
    }

    return () => window.removeEventListener('resize', onResize);
  }, [items, ease]);

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.3,
      ease,
      overwrite: 'auto'
    });
  };

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.2,
      ease,
      overwrite: 'auto'
    });
  };

  const cssVars = {
    '--base': baseColor,
    '--pill-bg': pillColor,
    '--hover-text': hoveredPillTextColor,
    '--pill-text': resolvedPillTextColor
  } as React.CSSProperties;

  return (
    <nav className={`pill-nav-wrapper ${className}`} aria-label="Navigation" style={cssVars}>
      <div className="pill-nav-items-wrapper" ref={navItemsRef}>
        <ul className="pill-list-wrapper" role="menubar">
          {items.map((item, i) => (
            <li key={`item-${i}`} role="none">
              <button
                role="menuitem"
                className={`pill-button ${item.isActive ? 'is-active' : ''}`}
                aria-label={item.label}
                onMouseEnter={() => handleEnter(i)}
                onMouseLeave={() => handleLeave(i)}
                onClick={item.onClick}
              >
                <span
                  className="hover-circle"
                  aria-hidden="true"
                  ref={el => {
                    circleRefs.current[i] = el;
                  }}
                />
                <span className="label-stack">
                  {item.icon && <span className="pill-icon">{item.icon}</span>}
                  <span className="pill-label">{item.label}</span>
                  <span className="pill-label-hover" aria-hidden="true">
                    {item.icon && <span className="pill-icon">{item.icon}</span>}
                    {item.label}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default PillNav;
