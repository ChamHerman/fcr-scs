import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

interface BrandLogoProps {
  size?: number;
  className?: string;
  ringOn?: boolean;
}

/**
 * Circular brand mark rendered from /fcr-scs.jpg.
 * Hover: GSAP bouncy scale 1.08.
 * Click: 360° spin via contextSafe callback (animation stacks on repeat clicks).
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 40,
  className = '',
  ringOn = true,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);

  useGSAP(() => {
    const onEnter = () => {
      if (!imgRef.current) return;
      gsap.to(imgRef.current, { scale: 1.08, duration: 0.35, ease: 'back.out(1.6)' });
    };
    const onLeave = () => {
      if (!imgRef.current) return;
      gsap.to(imgRef.current, { scale: 1, duration: 0.3, ease: 'power2.out' });
    };
    const onClick = () => {
      if (!imgRef.current) return;
      gsap.to(imgRef.current, { rotation: '+=360', duration: 0.7, ease: 'back.out(1.6)' });
    };

    const el = imgRef.current;
    if (!el) return;
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('click', onClick);
    };
  }, { scope: imgRef });

  return (
    <img
      ref={imgRef}
      src="/fcr-scs.png"
      alt="FCR-SCS"
      width={size}
      height={size}
      draggable={false}
      className={`rounded-full object-cover shadow-sm cursor-pointer select-none will-change-transform ${
        ringOn ? 'ring-2 ring-md-primary/20' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

// Backwards-compatible alias so existing import sites keep working.
export const Logo = BrandLogo;
