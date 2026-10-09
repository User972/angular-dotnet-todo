export interface Todo {
  id: number;
  title: string;
  isCompleted: boolean;
  /** ISO 8601 timestamp, set by the server. */
  createdAt: string;
  /** ISO 8601 timestamp, set by the server; null while the todo is open. */
  completedAt: string | null;
}

/** Mirrors TodoConstraints.MaxTitleLength on the API. */
export const MAX_TITLE_LENGTH = 200;

export type TodoFilter = 'all' | 'active' | 'completed';
