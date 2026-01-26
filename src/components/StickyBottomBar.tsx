import React, { useEffect, useState } from 'react';
import { BugReportButton } from './BugReportButton';
import { CookieBanner } from './CookieBanner';

/**
 * Sticky container that groups the bug report button and cookie banner
 * at the bottom of the viewport, above the footer.
 * The bug button remains visible even after the cookie banner is dismissed.
 */
export const StickyBottomBar: React.FC = () => {
  const [footerOffset, setFooterOffset] = useState(0);

  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const overlap = entry.isIntersecting ? Math.ceil(entry.intersectionRect.height) : 0;
        setFooterOffset(overlap);
      },
      { threshold: [0, 0.05, 0.2, 0.5, 1] },
    );

    observer.observe(footer);

    return () => observer.disconnect();
  }, []);

  const bugButtonOffset = footerOffset > 0 ? footerOffset + 8 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* Bug button - always visible, positioned top-right of the sticky area */}
      <div
        className="absolute bottom-full right-0 pointer-events-none"
        style={{ marginBottom: bugButtonOffset }}
      >
        <div className="m-4 pointer-events-auto">
          <BugReportButton />
        </div>
      </div>
      
      {/* Cookie banner - only visible when not dismissed */}
      <div className="pointer-events-auto">
        <CookieBanner />
      </div>
    </div>
  );
};
