export const CircleRole = {
  ADMIN: 'admin',
  FAMILY: 'family',
  PROFESSIONAL: 'professional',
  READONLY: 'readonly',
} as const;
export type CircleRole = (typeof CircleRole)[keyof typeof CircleRole];

export const ROLE_HIERARCHY: Record<CircleRole, number> = {
  [CircleRole.ADMIN]: 4,
  [CircleRole.FAMILY]: 3,
  [CircleRole.PROFESSIONAL]: 2,
  [CircleRole.READONLY]: 1,
};

export const TaskCategory = {
  MEDICAL: 'medical',
  LEGAL: 'legal',
  FINANCIAL: 'financial',
  GENERAL: 'general',
} as const;
export type TaskCategory = (typeof TaskCategory)[keyof typeof TaskCategory];

export const TaskPriority = {
  URGENT: 'urgent',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  [TaskPriority.URGENT]: 4,
  [TaskPriority.HIGH]: 3,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.LOW]: 1,
};

export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  DONE: 'done',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const VisitStatus = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type VisitStatus = (typeof VisitStatus)[keyof typeof VisitStatus];

export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
} as const;
export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus];

export const DocumentCategory = {
  LEGAL: 'legal',
  INSURANCE: 'insurance',
  MEDICAL: 'medical',
  IDENTIFICATION: 'identification',
  OTHER: 'other',
} as const;
export type DocumentCategory = (typeof DocumentCategory)[keyof typeof DocumentCategory];

export const Mood = {
  CALM: 'calm',
  AGITATED: 'agitated',
  CONFUSED: 'confused',
  HAPPY: 'happy',
  WITHDRAWN: 'withdrawn',
  OTHER: 'other',
} as const;
export type Mood = (typeof Mood)[keyof typeof Mood];

export const SleepQuality = {
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
} as const;
export type SleepQuality = (typeof SleepQuality)[keyof typeof SleepQuality];

export const MealAmount = {
  FULL: 'full',
  PARTIAL: 'partial',
  REFUSED: 'refused',
} as const;
export type MealAmount = (typeof MealAmount)[keyof typeof MealAmount];

export const RecurrenceFrequency = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
} as const;
export type RecurrenceFrequency = (typeof RecurrenceFrequency)[keyof typeof RecurrenceFrequency];

export const ExpenseCategory = {
  MEDICAL: 'medical',
  SUPPLIES: 'supplies',
  HOME_MODIFICATION: 'home_modification',
  TRAVEL: 'travel',
  PROFESSIONAL_CARE: 'professional_care',
  OTHER: 'other',
} as const;
export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const ResourceType = {
  LOCAL: 'local',
  ONLINE: 'online',
  HOTLINE: 'hotline',
  SUPPORT_GROUP: 'support_group',
  GOVERNMENT: 'government',
  FINANCIAL: 'financial',
} as const;
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export const SIDEBAR_WIDTH = 260;
