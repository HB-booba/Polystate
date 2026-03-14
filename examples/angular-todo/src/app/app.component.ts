import { AsyncPipe, NgClass, NgFor, TitleCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Todo, TodoService } from './todo.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [AsyncPipe, NgFor, NgClass, TitleCasePipe],
    styles: [`
        :host { font-family: sans-serif; display: block; max-width: 480px; margin: 2rem auto; }
        h1 { font-size: 1.5rem; margin-bottom: 1rem; }
        .add-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .add-row input { flex: 1; padding: 0.4rem 0.6rem; font-size: 1rem; }
        ul { list-style: none; padding: 0; }
        li { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0; }
        li span { flex: 1; }
        li.done span { text-decoration: line-through; color: #aaa; }
        .filters { margin-top: 1rem; display: flex; gap: 0.5rem; }
        .filters button { padding: 0.3rem 0.8rem; cursor: pointer; }
        .filters button.active { font-weight: bold; text-decoration: underline; }
    `],
    template: `
        <h1>Angular Todo — Polystate Runtime</h1>

        <div class="add-row">
            <input
                #titleInput
                placeholder="What needs to be done?"
                (keydown.enter)="addTodo(titleInput.value); titleInput.value = ''"
            />
            <button (click)="addTodo(titleInput.value); titleInput.value = ''">Add</button>
        </div>

        <ul>
            <li
                *ngFor="let item of todoService.filteredTodos$ | async"
                [ngClass]="{ done: item.done }"
            >
                <input
                    type="checkbox"
                    [checked]="item.done"
                    (change)="toggleTodo(item)"
                />
                <span>{{ item.title }}</span>
                <button (click)="removeTodo(item)">✕</button>
            </li>
        </ul>

        <div class="filters">
            <button
                *ngFor="let f of filters"
                [ngClass]="{ active: (todoService.filter$ | async) === f }"
                (click)="setFilter(f)"
            >
                {{ f | titlecase }}
            </button>
        </div>
    `,
})
export class AppComponent {
    readonly todoService = inject(TodoService);
    readonly filters = ['all', 'active', 'completed'] as const;

    addTodo(title: string): void {
        const trimmed = title.trim();
        if (trimmed) {
            this.todoService.dispatch('addTodo', trimmed);
        }
    }

    toggleTodo(item: Todo): void {
        this.todoService.dispatch('toggleTodo', item.id);
    }

    removeTodo(item: Todo): void {
        this.todoService.dispatch('removeTodo', item.id);
    }

    setFilter(filter: string): void {
        this.todoService.dispatch('setFilter', filter);
    }
}
