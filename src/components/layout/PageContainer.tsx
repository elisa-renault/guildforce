import { type ComponentPropsWithoutRef, type ElementType } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const pageContainerVariants = cva('w-full px-4 md:px-5 xl:px-6 2xl:px-8', {
  variants: {
    width: {
      contained: 'mx-auto max-w-5xl',
      wide: 'mx-auto md:max-w-6xl lg:max-w-7xl xl:max-w-screen-2xl 2xl:max-w-[1600px]',
      app: 'max-w-none',
      workspace: 'max-w-none',
      full: '',
    },
    spacing: {
      none: '',
      sm: 'py-4',
      md: 'py-6',
      lg: 'py-8',
    },
  },
  defaultVariants: {
    width: 'wide',
    spacing: 'none',
  },
});

type PageContainerOwnProps<T extends ElementType> = {
  as?: T;
} & VariantProps<typeof pageContainerVariants>;

export type PageContainerProps<T extends ElementType = 'div'> = PageContainerOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof PageContainerOwnProps<T>>;

export const PageContainer = <T extends ElementType = 'div'>({
  as,
  className,
  width,
  spacing,
  ...props
}: PageContainerProps<T>) => {
  const Comp = (as ?? 'div') as ElementType;

  return (
    <Comp
      className={cn(pageContainerVariants({ width, spacing }), className)}
      {...props}
    />
  );
};
