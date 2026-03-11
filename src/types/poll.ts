export type PollStatus = 'draft' | 'active' | 'closed';
export type PollQuestionType = 'single_choice' | 'multiple_choice' | 'text' | 'rating' | 'date' | 'time' | 'datetime' | 'ranking' | 'scale';
export type PollQuestionAnalysisIntent = 'decision' | 'informative';
export type PollResultsBaseAudience = 'guild_members' | 'eligible_respondents' | 'restricted';
export type PollResultsVisibilityLevel = 'none' | 'non_text' | 'full';
export type PollResultsAudienceType = 'base_audience' | 'rank_range' | 'user';
export type PollResultsTargetType = 'poll' | 'section' | 'question' | 'question_type';
export type PollResultsCohortFilterableQuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'rating'
  | 'date'
  | 'time'
  | 'datetime'
  | 'scale';
export type PollResultsCohortRedactionReason = 'minimum_sample' | 'text_hidden';

export interface GuildPollSection {
  id: string;
  poll_id: string;
  title: string;
  description: string | null;
  display_order: number;
  created_at: string;
  // For form
  questions?: GuildPollQuestion[];
}

export interface ScaleConfig {
  min: number;
  max: number;
  step: number;
  display?: 'stars' | 'slider';
  min_label?: string;
  max_label?: string;
}

// Condition for conditional questions
export type ConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains'
  // Numeric operators for scale/rating questions
  | 'greater_than'
  | 'less_than'
  | 'greater_equals'
  | 'less_equals';

export interface QuestionCondition {
  question_id: string;        // Source question ID
  operator: ConditionOperator;
  values: string[];           // Trigger values (for choice) or numeric thresholds (for scale)
}

export interface GuildPoll {
  id: string;
  guild_id: string;
  roster_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  is_anonymous: boolean;
  allow_multiple_responses: boolean;
  status: PollStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  results_base_audience?: PollResultsBaseAudience;
  results_base_visibility?: PollResultsVisibilityLevel;
  // Joined data
  creator?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  roster?: {
    id: string;
    name: string;
  };
  sections?: GuildPollSection[];
  questions?: GuildPollQuestion[];
  response_count?: number;
  member_count?: number;
}

export interface GuildPollQuestion {
  id: string;
  poll_id: string;
  section_id: string | null;
  question_text: string;
  question_type: PollQuestionType;
  analysis_intent?: PollQuestionAnalysisIntent | null;
  is_required: boolean;
  display_order: number;
  options: string[];
  scale_config: ScaleConfig | null;
  allow_other: boolean;
  condition: QuestionCondition | null;
  created_at: string;
  // For responses
  responses?: GuildPollResponse[];
  my_response?: GuildPollResponse;
  effective_visibility?: PollResultsVisibilityLevel;
  cohort_redacted?: boolean;
  cohort_redaction_reason?: PollResultsCohortRedactionReason | null;
  cohort_response_count?: number;
}

export type PollResultsVariant = 'compact' | 'full';

export interface GuildPollResponse {
  id: string;
  question_id: string;
  user_id: string;
  response_value: ResponseValue;
  created_at: string;
  // Joined data (only visible if not anonymous)
  user?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

// Response value types - extended with other_text for "Other" option
export type ResponseValue = 
  | { type: 'single_choice'; value: string; other_text?: string }
  | { type: 'multiple_choice'; values: string[]; other_text?: string }
  | { type: 'text'; value: string }
  | { type: 'rating'; value: number }
  | { type: 'date'; value: string }
  | { type: 'time'; value: string }
  | { type: 'datetime'; value: string }
  | { type: 'ranking'; values: string[] }
  | { type: 'scale'; value: number };

export interface SectionFormData {
  id?: string;
  title: string;
  description: string;
  questions: QuestionFormData[];
}

export interface PollFormData {
  title: string;
  description: string;
  is_anonymous: boolean;
  allow_multiple_responses: boolean;
  roster_id: string | null;
  ends_at: string | null;
  sections: SectionFormData[];
  questions: QuestionFormData[]; // Questions without section
}

export interface QuestionFormData {
  id?: string;
  section_id?: string | null;
  question_text: string;
  question_type: PollQuestionType;
  analysis_intent?: PollQuestionAnalysisIntent | null;
  is_required: boolean;
  options: string[];
  scale_config?: ScaleConfig | null;
  allow_other?: boolean;
  condition?: QuestionCondition | null;
}

export interface PollResultsAccessRule {
  audience_type: PollResultsAudienceType;
  visibility_level: PollResultsVisibilityLevel;
  target_type: PollResultsTargetType;
  user_id?: string;
  min_rank_index?: number;
  max_rank_index?: number;
  section_id?: string;
  question_id?: string;
  question_type?: PollQuestionType;
}

export interface PollResultsAccessConfig {
  base_audience: PollResultsBaseAudience;
  base_visibility: PollResultsVisibilityLevel;
  rules: PollResultsAccessRule[];
}

export interface PollResultsCohortFilter {
  question_id: string;
  question_type: PollResultsCohortFilterableQuestionType;
  match_value: string;
}

export interface PollResultsCohortQuestionResult {
  question_id: string;
  response_count: number;
  is_redacted: boolean;
  redaction_reason?: PollResultsCohortRedactionReason | null;
  responses: GuildPollResponse[];
}

export interface PollResultsCohortAnalysis {
  cohort_respondent_count: number;
  global_respondent_count: number;
  is_anonymous_guarded: boolean;
  filters: PollResultsCohortFilter[];
  questions: PollResultsCohortQuestionResult[];
}

// Special value for "Other" option
export const OTHER_OPTION_VALUE = '__OTHER__';
