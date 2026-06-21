/**
 * Represents a member's wish for a single choice
 */
export type ValidationStatus = 'pending' | 'approved' | 'rejected';
export type RosterSelectionStatus = 'undecided' | 'selected' | 'bench' | 'not_selected';
export type RosterSelectionReasonCode =
  | 'role_fit'
  | 'composition'
  | 'attendance'
  | 'performance'
  | 'trial'
  | 'conflict'
  | 'other';

export interface WishChoice {
  choice_index: number;
  class_id: string;
  spec_ids: string[]; // ordered by priority, first = main spec
  comment: string | null;
  validation_status?: ValidationStatus;
  validated_by?: string | null;
  validated_at?: string | null;
  validated_by_username?: string | null;
}

export interface RosterSeasonOutcome {
  first_choice_granted?: boolean;
  granted_choice_index?: number | null;
  final_class_id?: string | null;
  final_spec_id?: string | null;
  changed_class_during_season?: boolean;
  changed_for_raid_need?: boolean;
  joined_mid_season?: boolean;
  left_mid_season?: boolean;
  final_status?: string | null;
}

/**
 * Represents a guild member with their wishes
 */
export interface MemberWish {
  id: string;
  seasonMemberId?: string | null;
  username: string;
  mainCharacterName?: string | null;
  realmName?: string | null;
  rankIndex?: number | null;
  status: 'confirmed' | 'potential' | string;
  wishes: WishChoice[];
  wishes_locked?: boolean;
  isExternal?: boolean;
  externalWishId?: string | null;
  rosterCacheId?: string | null;
  selectionStatus?: RosterSelectionStatus;
  selectionReasonCode?: RosterSelectionReasonCode | null;
  selectionComment?: string | null;
  selectionDecidedBy?: string | null;
  selectionDecidedAt?: string | null;
  selectionUpdatedAt?: string | null;
  seasonOutcome?: RosterSeasonOutcome | null;
}

/**
 * Data structure for editing a wish
 */
export interface WishData {
  classId: string;
  specIds: string[]; // ordered by priority, first = main spec
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
export type CommitmentFilter = 'confirmed' | 'undecided' | 'withdrawn';
export type RangeFilter = 'melee' | 'ranged';

export interface RosterFilters {
  roleFilters: string[];
  classFilters: string[];
  validationFilters: ValidationStatus[];
  rosterDecisionFilters: RosterSelectionStatus[];
  searchQuery: string;
  filterMode: 'and' | 'or';
  // Extended filters
  commitmentFilters: CommitmentFilter[];
  minWishes: number | null;
  rangeFilters: RangeFilter[];
  hasComment: boolean | null;
  maxWishIndex: number | null; // null = all wishes, 1-13 = limit to first N
}
