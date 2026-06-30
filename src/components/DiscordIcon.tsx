import * as React from 'react';

interface DiscordIconProps extends React.SVGAttributes<SVGElement> {
  className?: string;
}

export const DiscordIcon = React.forwardRef<SVGSVGElement, DiscordIconProps>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref}
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path d="M20.317 4.369A19.791 19.791 0 0 0 15.354 2.8a13.787 13.787 0 0 0-.635 1.304 18.27 18.27 0 0 0-5.438 0A13.847 13.847 0 0 0 8.646 2.8a19.736 19.736 0 0 0-4.963 1.569C.543 9.016-.315 13.546.11 18.013a19.94 19.94 0 0 0 6.083 3.087 14.69 14.69 0 0 0 1.302-2.107 12.96 12.96 0 0 1-2.048-.985c.172-.125.34-.254.502-.386a14.199 14.199 0 0 0 12.102 0c.164.132.331.261.502.386-.647.388-1.335.72-2.049.986A14.69 14.69 0 0 0 17.807 21.1a19.868 19.868 0 0 0 6.083-3.087c.5-5.177-.854-9.666-3.573-13.644ZM8.02 15.268c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.955 2.419-2.157 2.419Zm7.96 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.947 2.419-2.157 2.419Z" />
    </svg>
  ),
);

DiscordIcon.displayName = 'DiscordIcon';
