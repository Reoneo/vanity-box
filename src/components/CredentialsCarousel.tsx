import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import talentProtocolIcon from '@/assets/talent-protocol-icon.jpeg';
import polymarketLogo from '@/assets/polymarket-logo.png';
import './CredentialsCarousel.css';

const DRAG_BUFFER = 0;
const VELOCITY_THRESHOLD = 500;
const GAP = 16;
const SPRING_OPTIONS = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface CredentialScores {
  primary: { value: number | null; label: string; levelLabel?: string };
  secondary?: { value: number | null; label: string; levelLabel?: string };
}

interface CarouselItem {
  id: string;
  title: string;
  icon: string;
  scores?: CredentialScores;
  onClick?: () => void;
  hidden?: boolean;
}

interface CarouselItemProps {
  item: CarouselItem;
  index: number;
  itemWidth: number;
  trackItemOffset: number;
  x: any;
  transition: any;
}

function getLevelLabel(score: number | null): string {
  if (score === null) return '';
  if (score >= 80) return 'Expert';
  if (score >= 60) return 'Practitioner';
  if (score >= 40) return 'Emerging';
  if (score >= 20) return 'Level 2';
  return 'Level 1';
}

function CarouselItemCard({ item, index, itemWidth, trackItemOffset, x, transition }: CarouselItemProps) {
  const range = [-(index + 1) * trackItemOffset, -index * trackItemOffset, -(index - 1) * trackItemOffset];
  const outputRange = [90, 0, -90];
  const rotateY = useTransform(x, range, outputRange, { clamp: false });

  return (
    <motion.div
      className="credentials-carousel-item"
      style={{
        width: itemWidth,
        height: '100%',
        rotateY: rotateY,
      }}
      transition={transition}
      onClick={item.onClick}
    >
      {/* Header with icon and title */}
      <div className="credentials-card-header">
        <div className="credentials-icon-wrapper">
          <img 
            src={item.icon} 
            alt={item.title}
            className="credentials-icon"
          />
        </div>
        <span className="credentials-title">{item.title}</span>
      </div>

      {/* Scores grid */}
      {item.scores && (
        <div className="credentials-scores-grid">
          <div className="credentials-score-item">
            <span className="credentials-score-value">
              {item.scores.primary.value !== null && item.scores.primary.value !== undefined 
                ? String(item.scores.primary.value) 
                : '—'}
            </span>
            {item.scores.primary.value !== null && item.scores.primary.value !== undefined && (
              <span className="credentials-score-level">
                {String(item.scores.primary.levelLabel || getLevelLabel(item.scores.primary.value as number))}
              </span>
            )}
            <span className="credentials-score-label">{String(item.scores.primary.label)}</span>
          </div>
          
          {item.scores.secondary && (
            <div className="credentials-score-item">
              <span className="credentials-score-value">
                {item.scores.secondary.value !== null && item.scores.secondary.value !== undefined 
                  ? String(item.scores.secondary.value) 
                  : '—'}
              </span>
              {item.scores.secondary.value !== null && item.scores.secondary.value !== undefined && (
                <span className="credentials-score-level">
                  {String(item.scores.secondary.levelLabel || getLevelLabel(item.scores.secondary.value as number))}
                </span>
              )}
              <span className="credentials-score-label">{String(item.scores.secondary.label)}</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

interface CredentialsCarouselProps {
  wallet?: string;
  ens?: string;
  talentScore?: number | null;
  talentCreatorScore?: number | null;
  polymarketWinRate?: number | null;
  polymarketProfit?: number | null;
  hasPolymarketData?: boolean;
  onTalentClick?: () => void;
  onPolymarketClick?: () => void;
  baseWidth?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  loop?: boolean;
}

export default function CredentialsCarousel({
  wallet,
  ens,
  talentScore,
  talentCreatorScore,
  polymarketWinRate,
  polymarketProfit,
  hasPolymarketData = false,
  onTalentClick,
  onPolymarketClick,
  baseWidth = 340,
  autoplay = true,
  autoplayDelay = 4000,
  pauseOnHover = true,
  loop = true,
}: CredentialsCarouselProps) {
  const containerPadding = 16;
  const itemWidth = baseWidth - containerPadding * 2;
  const trackItemOffset = itemWidth + GAP;
  
  // Build items array - filter out hidden items
  const items: CarouselItem[] = useMemo(() => {
    const allItems: CarouselItem[] = [
      {
        id: 'talent',
        title: 'Talent Protocol',
        icon: talentProtocolIcon,
        scores: {
          primary: { 
            value: talentScore, 
            label: 'Builder Score',
            levelLabel: getLevelLabel(talentScore)
          },
          secondary: { 
            value: talentCreatorScore ?? 14, 
            label: 'Creator Score',
            levelLabel: 'Level 1'
          },
        },
        onClick: onTalentClick,
        hidden: false, // Always show talent
      },
      {
        id: 'polymarket',
        title: 'Polymarket',
        icon: polymarketLogo,
        scores: {
          primary: { 
            value: polymarketWinRate, 
            label: 'Win Rate',
            levelLabel: polymarketWinRate ? `${polymarketWinRate}%` : undefined
          },
          secondary: polymarketProfit !== null ? { 
            value: polymarketProfit, 
            label: 'Profit',
            levelLabel: polymarketProfit ? `$${polymarketProfit.toFixed(2)}` : undefined
          } : undefined,
        },
        onClick: onPolymarketClick,
        hidden: !hasPolymarketData, // Hide if no polymarket data
      },
    ];
    
    return allItems.filter(item => !item.hidden);
  }, [talentScore, talentCreatorScore, polymarketWinRate, polymarketProfit, hasPolymarketData, onTalentClick, onPolymarketClick]);

  const itemsForRender = useMemo(() => {
    if (!loop || items.length <= 1) return items;
    if (items.length === 0) return [];
    return [items[items.length - 1], ...items, items[0]];
  }, [items, loop]);

  const [position, setPosition] = useState(loop && items.length > 1 ? 1 : 0);
  const x = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (pauseOnHover && containerRef.current) {
      const container = containerRef.current;
      const handleMouseEnter = () => setIsHovered(true);
      const handleMouseLeave = () => setIsHovered(false);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [pauseOnHover]);

  useEffect(() => {
    if (!autoplay || items.length <= 1) return undefined;
    if (pauseOnHover && isHovered) return undefined;

    const timer = setInterval(() => {
      setPosition(prev => Math.min(prev + 1, itemsForRender.length - 1));
    }, autoplayDelay);

    return () => clearInterval(timer);
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, itemsForRender.length, items.length]);

  useEffect(() => {
    const startingPosition = (loop && items.length > 1) ? 1 : 0;
    setPosition(startingPosition);
    x.set(-startingPosition * trackItemOffset);
  }, [items.length, loop, trackItemOffset, x]);

  useEffect(() => {
    if (!loop && position > itemsForRender.length - 1) {
      setPosition(Math.max(0, itemsForRender.length - 1));
    }
  }, [itemsForRender.length, loop, position]);

  const effectiveTransition = isJumping ? { duration: 0 } : SPRING_OPTIONS;

  const handleAnimationStart = () => {
    setIsAnimating(true);
  };

  const handleAnimationComplete = () => {
    if (!loop || items.length <= 1 || itemsForRender.length <= 1) {
      setIsAnimating(false);
      return;
    }
    const lastCloneIndex = itemsForRender.length - 1;

    if (position === lastCloneIndex) {
      setIsJumping(true);
      const target = 1;
      setPosition(target);
      x.set(-target * trackItemOffset);
      requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
      return;
    }

    if (position === 0) {
      setIsJumping(true);
      const target = items.length;
      setPosition(target);
      x.set(-target * trackItemOffset);
      requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
      return;
    }

    setIsAnimating(false);
  };

  const handleDragEnd = (_: any, info: any) => {
    const { offset, velocity } = info;
    const direction =
      offset.x < -DRAG_BUFFER || velocity.x < -VELOCITY_THRESHOLD
        ? 1
        : offset.x > DRAG_BUFFER || velocity.x > VELOCITY_THRESHOLD
          ? -1
          : 0;

    if (direction === 0) return;

    setPosition(prev => {
      const next = prev + direction;
      const max = itemsForRender.length - 1;
      return Math.max(0, Math.min(next, max));
    });
  };

  const dragProps = loop
    ? {}
    : {
        dragConstraints: {
          left: -trackItemOffset * Math.max(itemsForRender.length - 1, 0),
          right: 0
        }
      };

  const activeIndex =
    items.length === 0 ? 0 : (loop && items.length > 1) ? (position - 1 + items.length) % items.length : Math.min(position, items.length - 1);

  if (items.length === 0) return null;

  // If only one item, render without carousel mechanics
  if (items.length === 1) {
    const item = items[0];
    return (
      <div
        ref={containerRef}
        className="credentials-carousel-container single-item"
        style={{ width: `${baseWidth}px` }}
      >
        <div
          className="credentials-carousel-item"
          style={{ width: itemWidth }}
          onClick={item.onClick}
        >
          <div className="credentials-card-header">
            <div className="credentials-icon-wrapper">
              <img 
                src={item.icon} 
                alt={item.title}
                className="credentials-icon"
              />
            </div>
            <span className="credentials-title">{item.title}</span>
          </div>

          {item.scores && (
            <div className="credentials-scores-grid">
              <div className="credentials-score-item">
                <span className="credentials-score-value">
                  {item.scores.primary.value !== null && item.scores.primary.value !== undefined 
                    ? String(item.scores.primary.value) 
                    : '—'}
                </span>
                {item.scores.primary.value !== null && item.scores.primary.value !== undefined && (
                  <span className="credentials-score-level">
                    {String(item.scores.primary.levelLabel || getLevelLabel(item.scores.primary.value as number))}
                  </span>
                )}
                <span className="credentials-score-label">{String(item.scores.primary.label)}</span>
              </div>
              
              {item.scores.secondary && (
                <div className="credentials-score-item">
                  <span className="credentials-score-value">
                    {item.scores.secondary.value !== null && item.scores.secondary.value !== undefined 
                      ? String(item.scores.secondary.value) 
                      : '—'}
                  </span>
                  {item.scores.secondary.value !== null && item.scores.secondary.value !== undefined && (
                    <span className="credentials-score-level">
                      {String(item.scores.secondary.levelLabel || getLevelLabel(item.scores.secondary.value as number))}
                    </span>
                  )}
                  <span className="credentials-score-label">{String(item.scores.secondary.label)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="credentials-carousel-container"
      style={{ width: `${baseWidth}px` }}
    >
      <motion.div
        className="credentials-carousel-track"
        drag={isAnimating ? false : 'x'}
        {...dragProps}
        style={{
          width: itemWidth,
          gap: `${GAP}px`,
          perspective: 1000,
          perspectiveOrigin: `${position * trackItemOffset + itemWidth / 2}px 50%`,
          x
        }}
        onDragEnd={handleDragEnd}
        animate={{ x: -(position * trackItemOffset) }}
        transition={effectiveTransition}
        onAnimationStart={handleAnimationStart}
        onAnimationComplete={handleAnimationComplete}
      >
        {itemsForRender.map((item, index) => (
          <CarouselItemCard
            key={`${item?.id ?? index}-${index}`}
            item={item}
            index={index}
            itemWidth={itemWidth}
            trackItemOffset={trackItemOffset}
            x={x}
            transition={effectiveTransition}
          />
        ))}
      </motion.div>
      <div className="credentials-carousel-indicators-container">
        <div className="credentials-carousel-indicators">
          {items.map((_, index) => (
            <motion.div
              key={index}
              className={`credentials-carousel-indicator ${activeIndex === index ? 'active' : 'inactive'}`}
              animate={{
                scale: activeIndex === index ? 1.2 : 1
              }}
              onClick={() => setPosition((loop && items.length > 1) ? index + 1 : index)}
              transition={{ duration: 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}