import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { useLanguage } from '@/contexts/LanguageContext';
import { getRouteMeta } from '@/routes';
import type { RouteLabelKey } from '@/routes';

export interface BreadcrumbItem {
  label?: string;
  labelKey?: RouteLabelKey;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => {
  const location = useLocation();
  const { t } = useLanguage();
  const routeBreadcrumbs = getRouteMeta(location.pathname)?.breadcrumb ?? [];
  const resolvedItems = (items ?? routeBreadcrumbs)
    .map((item) => ({
      ...item,
      label: item.label ?? (item.labelKey ? t.routeMeta[item.labelKey] : ''),
    }))
    .filter((item) => item.label);

  if (resolvedItems.length === 0) return null;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {resolvedItems.map((item, index) => {
          const isLast = index === resolvedItems.length - 1;

          return (
            <BreadcrumbItem key={index}>
              {isLast || !item.href ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
              {!isLast && <BreadcrumbSeparator />}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
