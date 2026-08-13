import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Wallet, Copy } from 'lucide-react';
import { useNotification } from './NotificationSystem';

interface WalletButtonProps {
  walletAddress?: string;
  adminId?: string;
}

export const WalletButton: React.FC<WalletButtonProps> = ({ 
  walletAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 
  adminId = 'Admin' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { notify } = useNotification();
  const { contextSafe } = useGSAP({ scope: containerRef });

  const truncatedAddress = walletAddress.length > 12
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : walletAddress;

  const handleMouseEnter = contextSafe(() => {
    gsap.to(cardRef.current, {
      rotationX: 180,
      duration: 0.6,
      ease: 'back.out(1.5)',
      overwrite: 'auto'
    });
  });

  const handleMouseLeave = contextSafe(() => {
    gsap.to(cardRef.current, {
      rotationX: 0,
      duration: 0.5,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  });

  const handleCopy = contextSafe(() => {
    navigator.clipboard.writeText(walletAddress);
    
    // Add a slight click press effect to the button container
    gsap.fromTo(containerRef.current, 
      { scale: 0.95 },
      { scale: 1, duration: 0.3, ease: 'back.out(2)' }
    );
    
    notify({
      type: 'success',
      title: 'Address Copied',
      message: `${truncatedAddress} copied to clipboard.`
    });
  });

  return (
    <div 
      ref={containerRef}
      className="relative w-48 h-12 perspective-[1000px] cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCopy}
    >
      <div 
        ref={cardRef}
        className="w-full h-full relative preserve-3d transition-shadow hover:shadow-md rounded-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front Face: Admin Label */}
        <div 
          className="absolute inset-0 backface-hidden rounded-full flex items-center justify-center bg-md-secondary-container text-md-on-secondary-container border border-md-outline/10 font-medium"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <Wallet className="w-4 h-4 mr-2 text-md-primary" />
          {adminId}
        </div>

        {/* Back Face: Wallet Address + Copy */}
        <div 
          className="absolute inset-0 backface-hidden rounded-full flex items-center justify-center bg-md-primary text-md-on-primary font-mono text-sm shadow-md"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}
        >
          {truncatedAddress}
          <Copy className="w-3.5 h-3.5 ml-2 opacity-80" />
        </div>
      </div>
    </div>
  );
};
