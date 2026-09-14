import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';

gsap.registerPlugin(useGSAP);

interface RefreshButtonProps {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  className?: string;
}

/**
 * Shared GSAP-animated refresh control across Payment and Blockchain pages.
 * Features a realistic 1-second 360° spin (power2.inOut) on click,
 * guarantees that it always stops after refreshing, and never spins infinitely
 * on page land or after clicking.
 */
export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onClick,
  loading = false,
  label = 'Refresh',
  className,
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const { contextSafe } = useGSAP({ scope: containerRef });

  const handleClick = contextSafe(() => {
    if (loading || isSpinning) return;
    setIsSpinning(true);

    if (iconRef.current) {
      gsap.to(iconRef.current, {
        rotation: '+=360',
        duration: 1.0,
        ease: 'power2.inOut',
        onComplete: () => {
          setIsSpinning(false);
          onClick();
        },
      });
    } else {
      setIsSpinning(false);
      onClick();
    }
  });

  return (
    <span ref={containerRef} className="inline-flex">
      <Button
        type="button"
        variant="tonal"
        size="sm"
        onClick={handleClick}
        disabled={loading || isSpinning}
        className={className}
      >
        <RefreshCw ref={iconRef} size={14} className="mr-1" />
        <span>{label}</span>
      </Button>
    </span>
  );
};

