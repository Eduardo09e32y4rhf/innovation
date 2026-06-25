export type KanbanColumn = 'OVERDUE' | 'TODAY' | 'THIS_WEEK' | 'UPCOMING' | 'COMPLETED';

export interface KanbanEventsResponse {
  columns: {
    OVERDUE: any[];
    TODAY: any[];
    THIS_WEEK: any[];
    UPCOMING: any[];
    COMPLETED: any[];
  };
}