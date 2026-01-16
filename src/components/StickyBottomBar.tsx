import React from 'react';
import { BugReportButton } from './BugReportButton';
import { CookieBanner } from './CookieBanner';

/**
 * Sticky container that groups the bug report button and cookie banner
 * at the bottom of the viewport, above the footer.
 * The bug button remains visible even after the cookie banner is dismissed.
 */
export const StickyBottomBar: React.FC = () => {
  return (
    <div className="sticky bottom-0 z-50">
      {/* Bug button - always visible, positioned top-right of the sticky area */}
      <div className="absolute bottom-full right-0 mb-0 pointer-events-none">
        <div className="m-4 pointer-events-auto">
          <BugReportButton />
        </div>
      </div>
      
      {/* Cookie banner - only visible when not dismissed */}
      <CookieBanner />
    </div>
  );
};
