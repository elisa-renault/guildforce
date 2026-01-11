import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';
import { ComponentType } from 'react';

interface DynamicIconProps extends LucideProps {
  name: string;
  fallback?: string;
}

export const DynamicIcon = ({ name, fallback = '📁', ...props }: DynamicIconProps) => {
  // Check if it's an emoji (starts with an emoji character)
  const isEmoji = /^\p{Emoji}/u.test(name);
  if (isEmoji) {
    return <span className={props.className}>{name}</span>;
  }

  // Try to get the Lucide icon by name
  const icons = LucideIcons as unknown as Record<string, ComponentType<LucideProps>>;
  const IconComponent = icons[name];
  
  if (IconComponent && typeof IconComponent === 'function') {
    return <IconComponent {...props} />;
  }

  // Fallback to emoji or default
  return <span className={props.className}>{fallback}</span>;
};
