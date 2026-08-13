import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export function useModalPopIn<T extends HTMLElement = HTMLDivElement>(isOpen: boolean) {
  const modalRef = useRef<T>(null);

  useGSAP(() => {
    if (isOpen && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.96, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.28, ease: 'back.out(1.6)' }
      );
    }
  }, { dependencies: [isOpen] });

  return modalRef;
}
