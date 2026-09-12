import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface RefreshButtonProps {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}

/**
 * Shared refresh control for the payment module tables. Tonal MD3 button; the
 * icon plays a bouncy 360° spin on click (md-bouncy motion standard) and keeps
 * spinning continuously while data is loading.
 */
export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onClick,
  loading = false,
  label = 'Refresh',
}) => {
  const iconRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = iconRef.current;
    if (!el || !loading) return;
    const tween = gsap.to(el, { rotation: 360, duration: 1, ease: 'none', repeat: -1 });
    return () => {
      tween.kill();
      gsap.set(el, { rotation: 0 });
    };
  }, [loading]);

  const handleClick = () => {
    if (loading) return;
    if (iconRef.current) {
      gsap.fromTo(
        iconRef.current,
        { rotation: 0 },
        { rotation: 360, duration: 0.7, ease: 'back.out(1.4)', overwrite: 'auto' }
      );
    }
    onClick();
  };

  return (
    <Button
      type="button"
      variant="tonal"
      size="sm"
      onClick={handleClick}
      disabled={loading}
    >
      <RefreshCw ref={iconRef} size={14} />
      <span>{label}</span>
    </Button>
  );
};
