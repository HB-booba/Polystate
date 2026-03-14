import { Component } from '@angular/core';
import { TodoFacade } from './store/facade';

/**
 * Root App Component
 */
@Component({
    selector: 'app-root',
    template: `
    <div class="app">
      <header class="app-header">
        <h1>📝 Todo App</h1>
        <p class="subtitle">
          Built with Polystate Generated NgRx + Angular
        </p>
      </header>

      <main class="app-main">
        <!-- Add Todo Form -->
        <form (ngSubmit)="onAddTodo()" class="add-todo-form">
          <input
            type="text"
            [(ngModel)]="newTitle"
            name="title"
            placeholder="Add a new todo..."
            class="todo-input"
          />
          <button type="submit" class="add-button">Add Todo</button>
        </form>

        <!-- Filter Buttons -->
        <div class="filter-buttons">
          <button
            *ngFor="let f of filters"
            [class.active]="(filter$ | async) === f"
            (click)="onSetFilter(f)"
            class="filter-button"
          >
            {{ f | titlecase }}
          </button>
        </div>

        <!-- Todo List -->
        <div class="todo-list">
          <p *ngIf="(filteredTodos$ | async)?.length === 0" class="empty-message">
            {{ (filter$ | async) === 'all'
              ? 'No todos yet. Add one to get started!'
              : 'No ' + (filter$ | async) + ' todos.' }}
          </p>
          <div
            *ngFor="let todo of filteredTodos$ | async"
            class="todo-item"
          >
            <input
              type="checkbox"
              [checked]="todo.done"
              (change)="onToggleTodo(todo.id)"
              class="todo-checkbox"
            />
            <span [class.done]="todo.done" class="todo-title">
              {{ todo.title }}
            </span>
            <button
              (click)="onRemoveTodo(todo.id)"
              class="remove-button"
              aria-label="Remove todo"
            >
              ×
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div
          *ngIf="(filteredTodos$ | async)?.length && (filteredTodos$ | async)?.length > 0"
          class="stats"
        >
          <span>{{ activeTodoCount$ | async }} active</span>
          <span>·</span>
          <span>{{ completedTodoCount$ | async }} completed</span>
        </div>
      </main>
    </div>
  `,
    styleUrls: ['./app.component.css'],
    standalone: false,
})
export class AppComponent {
    newTitle = '';
    filters: Array<'all' | 'active' | 'completed'> = [
        'all',
        'active',
        'completed',
    ];

    filteredTodos$ = this.todoFacade.filteredTodos$;
    filter$ = this.todoFacade.filter$;
    activeTodoCount$ = this.todoFacade.activeTodoCount$;
    completedTodoCount$ = this.todoFacade.completedTodoCount$;

    constructor(public todoFacade: TodoFacade) { }

    onAddTodo(): void {
        if (this.newTitle.trim()) {
            this.todoFacade.addTodo(this.newTitle);
            this.newTitle = '';
        }
    }

    onToggleTodo(id: number): void {
        this.todoFacade.toggleTodo(id);
    }

    onRemoveTodo(id: number): void {
        this.todoFacade.removeTodo(id);
    }

    onSetFilter(filter: 'all' | 'active' | 'completed'): void {
        this.todoFacade.setFilter(filter);
    }
}
