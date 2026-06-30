import React, { useEffect, useRef, useState } from 'react';

import { BugReportButton } from './BugReportButton';
import { CookieBanner } from './CookieBanner';

const FLOATING_BUTTON_MARGIN = 16;

/**
 * Sticky container that groups the bug report button and cookie banner
 * at the bottom of the viewport, above the footer.
 * The bug button remains visible even after the cookie banner is dismissed.
 */
export const StickyBottomBar: React.FC = () => {
  const cookieContainerRef = useRef<HTMLDivElement | null>(null);
  const [bottomOffset, setBottomOffset] = useState(FLOATING_BUTTON_MARGIN);

  useEffect(() => {
    let animationFrame = 0;

    const updateOffset = () => {
      if (animationFrame) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;

        const footer = document.querySelector<HTMLElement>('footer');
        const footerRect = footer?.getBoundingClientRect();
        const footerOverlap = footerRect
          ? Math.max(0, window.innerHeight - Math.max(footerRect.top, 0))
          : 0;
        const cookieRect = cookieContainerRef.current?.getBoundingClientRect();
        const cookieHeight = cookieRect && cookieRect.height > 0 ? Math.ceil(cookieRect.height) : 0;

        setBottomOffset(FLOATING_BUTTON_MARGIN + footerOverlap + cookieHeight);
      });
    };

    updateOffset();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateOffset)
      : null;

    const footer = document.querySelector<HTMLElement>('footer');
    if (footer) resizeObserver?.observe(footer);
    if (cookieContainerRef.current) resizeObserver?.observe(cookieContainerRef.current);

    window.addEventListener('scroll', updateOffset, { passive: true });
    window.addEventListener('resize', updateOffset);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', updateOffset);
      window.removeEventListener('resize', updateOffset);
    };
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* Bug button - always visible, kept above cookie banner and visible footer. */}
      <div
        className="fixed right-4 pointer-events-auto"
        style={{ bottom: bottomOffset }}
      >
        <BugReportButton />
      </div>
      
      {/* Cookie banner - only visible when not dismissed */}
      <div ref={cookieContainerRef} className="pointer-events-auto">
        <CookieBanner />
      </div>
    </div>
  );
};
