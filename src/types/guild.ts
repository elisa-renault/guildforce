import { Role } from '@/data/wowClasses';

/**
 * Represents a member's wish for a single choice
 */
export type ValidationStatus = 'pending' | 'approved' | 'rejected';

export interface WishChoice {
  choice_index: number;
  class_id: string;
  spec_ids: string[];
  comment: string | null;
  validation_status?: ValidationStatus;
  validated_by?: string | null;
  validated_at?: string | null;
  validated_by_username?: string | null;
}

/**
 * Represents a guild member with their wishes
 */
export interface MemberWish {
  id: string;
  username: string;
  status: 'confirmed' | 'potential' | string;
  wishes: WishChoice[];
}

/**
 * Data structure for editing a wish
 */
export interface WishData {
  classId: string;
  specIds: string[];
  comment: string;
}

/**
 * Guild data with membership info
 */
export interface GuildWithMembership {
  id: string;
  name: string;
  server: string;
  faction: string;
  owner_id: string | null;
  role?: string;
}

/**
 * Role statistics for dashboard
 */
export interface RoleStats {
  tank: number;
  healer: number;
  dps: number;
}

export interface RangeStats {
  melee: number;
  ranged: number;
}

/**
 * Filter state for roster view
 */
export interface RosterFilters {
  roleFilters: string[];
  classFilters: string[];
  validationFilters: ValidationStatus[];
  searchQuery: string;
  filterMode: 'and' | 'or';
}
