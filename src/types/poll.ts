export type PollStatus = 'draft' | 'active' | 'closed';
export type PollQuestionType = 'single_choice' | 'multiple_choice' | 'text' | 'rating';

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
  questions?: GuildPollQuestion[];
  response_count?: number;
  member_count?: number;
}

export interface GuildPollQuestion {
  id: string;
  poll_id: string;
  question_text: string;
  question_type: PollQuestionType;
  is_required: boolean;
  display_order: number;
  options: string[];
  created_at: string;
  // For responses
  responses?: GuildPollResponse[];
  my_response?: GuildPollResponse;
}

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

export type ResponseValue = 
  | { type: 'single_choice'; value: string }
  | { type: 'multiple_choice'; values: string[] }
  | { type: 'text'; value: string }
  | { type: 'rating'; value: number };

export interface PollFormData {
  title: string;
  description: string;
  is_anonymous: boolean;
  allow_multiple_responses: boolean;
  roster_id: string | null;
  ends_at: string | null;
  questions: QuestionFormData[];
}

export interface QuestionFormData {
  id?: string;
  question_text: string;
  question_type: PollQuestionType;
  is_required: boolean;
  options: string[];
}
