/**
 * Generated NgRx state for todo store
 * Do not edit manually - regenerate with: polystate generate
 */

export interface TodoState {
    todos: Array<{
        id: number;
        title: string;
        done: boolean;
    }>;
    filter: 'all' | 'active' | 'completed';
}
