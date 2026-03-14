# @polystate/angular

Angular 17+ services for Polystate state management.

## Features

- **Angular 17+ Signals**: Native Signal support
- **RxJS Compatible**: Observable integration with async pipe
- **Lightweight**: < 1kb gzipped
- **Type-Safe**: Full TypeScript support
- **Dependency Injection**: Standard Angular DI patterns

## Installation

```bash
npm install @angular/core @angular/common rxjs
npm install @polystate/core @polystate/angular
```

## Quick Start

```typescript
import { Injectable } from '@angular/core';
import { createStore } from '@polystate/core';
import { PolystateService } from '@polystate/angular';

// Define state type
interface CounterState {
  count: number;
}

// Create service
@Injectable({ providedIn: 'root' })
export class CounterService extends PolystateService<CounterState> {
  // Create store
  private store = createStore<CounterState>(
    { count: 0 },
    {
      increment: (state) => ({ ...state, count: state.count + 1 }),
      decrement: (state) => ({ ...state, count: state.count - 1 }),
    }
  );

  // Create signals
  count = this.select((state) => state.count);
  count$ = this.select$((state) => state.count);

  increment() {
    this.dispatch('increment');
  }

  decrement() {
    this.dispatch('decrement');
  }
}
```

Use in component:

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CounterService } from './counter.service';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <!-- Using Signal -->
      <p>Count (Signal): {{ counter.count() }}</p>

      <!-- Using Observable with async pipe -->
      <p>Count (Observable): {{ counter.count$ | async }}</p>

      <button (click)="counter.increment()">+</button>
      <button (click)="counter.decrement()">-</button>
    </div>
  `,
})
export class CounterComponent {
  constructor(public counter: CounterService) {}
}
```

## API

### PolystateService<T>

Abstract base class for Polystate services.

#### select<S>

Returns Angular Signal with selected state slice.

```typescript
export class TodoService extends PolystateService<TodoState> {
  private store = createStore({ todos: [] }, {...});

  // Returns Signal<Todo[]>
  todos = this.select((state) => state.todos);

  // Usage in template
  // {{ service.todos() }}
}
```

**Returns**: `() => S` (Angular Signal)

#### select$<S>

Returns RxJS Observable with selected state slice.

```typescript
export class TodoService extends PolystateService<TodoState> {
  private store = createStore({ todos: [] }, {...});

  // Returns Observable<Todo[]>
  todos$ = this.select$((state) => state.todos);

  // Usage in template
  // {{ service.todos$ | async }}
}
```

**Returns**: `Observable<S>`

#### dispatch

Dispatch an action.

```typescript
service.dispatch('addTodo', 'Learn Angular');
service.dispatch('toggleTodo', todoId);
```

#### getState

Get current state snapshot.

```typescript
const state = service.getState();
const todos = service.getState((state) => state.todos);
```

## Complete Example

```typescript
// todo.service.ts
import { Injectable } from '@angular/core';
import { createStore } from '@polystate/core';
import { PolystateService } from '@polystate/angular';

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

@Injectable({ providedIn: 'root' })
export class TodoService extends PolystateService<TodoState> {
  private todoStore = createStore<TodoState>(
    { todos: [], filter: 'all' },
    {
      addTodo: (state, text: string) => ({
        ...state,
        todos: [...state.todos, { id: Date.now(), text, completed: false }],
      }),
      removeTodo: (state, id: number) => ({
        ...state,
        todos: state.todos.filter((todo) => todo.id !== id),
      }),
      toggleTodo: (state, id: number) => ({
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ),
      }),
      setFilter: (state, filter) => ({ ...state, filter }),
    }
  );

  // Signals
  todos = this.select((state) => state.todos);
  filter = this.select((state) => state.filter);

  // Observables
  todos$ = this.select$((state) => state.todos);
  filter$ = this.select$((state) => state.filter);

  // Computed signal (Angular 18+)
  filteredTodos = computed(() => {
    const todos = this.todos();
    const filter = this.filter();

    return todos.filter((todo) => {
      if (filter === 'completed') return todo.completed;
      if (filter === 'active') return !todo.completed;
      return true;
    });
  });

  addTodo(text: string) {
    this.dispatch('addTodo', text);
  }

  removeTodo(id: number) {
    this.dispatch('removeTodo', id);
  }

  toggleTodo(id: number) {
    this.dispatch('toggleTodo', id);
  }

  setFilter(filter: 'all' | 'active' | 'completed') {
    this.dispatch('setFilter', filter);
  }
}

// todo.component.ts
import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoService } from './todo.service';

@Component({
  selector: 'app-todos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="todos">
      <h2>Todo List</h2>

      <div class="input-group">
        <input
          #input
          type="text"
          placeholder="Add a todo..."
          (keyup.enter)="addTodo(input.value); input.value = ''"
        />
        <button (click)="addTodo(input.value); input.value = ''">Add</button>
      </div>

      <div class="filters">
        <button
          *ngFor="let f of ['all', 'active', 'completed']"
          [disabled]="todos.filter() === f"
          (click)="todos.setFilter(f)"
        >
          {{ f | titlecase }}
        </button>
      </div>

      <ul>
        <li *ngFor="let todo of todos.filteredTodos()">
          <input type="checkbox" [checked]="todo.completed" (change)="todos.toggleTodo(todo.id)" />
          <span [class.completed]="todo.completed">
            {{ todo.text }}
          </span>
          <button (click)="todos.removeTodo(todo.id)">Delete</button>
        </li>
      </ul>
    </div>
  `,
  styles: [
    `
      .todos {
        max-width: 500px;
        margin: 0 auto;
      }
    `,
  ],
})
export class TodosComponent {
  constructor(public todos: TodoService) {}

  addTodo(text: string) {
    if (text.trim()) {
      this.todos.addTodo(text.trim());
    }
  }
}
```

## Using Observable Pattern

Subscribe to observables in components:

```typescript
@Component({
  template: `
    <div *ngFor="let todo of todos$ | async">
      {{ todo.text }}
    </div>
  `,
})
export class TodoListComponent {
  todos$ = this.todoService.todos$;

  constructor(private todoService: TodoService) {}
}
```

## Using Signal Pattern

Use signals directly for better performance:

```typescript
@Component({
  template: `
    <div *ngFor="let todo of todos()">
      {{ todo.text }}
    </div>
  `,
})
export class TodoListComponent {
  todos = this.todoService.todos;

  constructor(private todoService: TodoService) {}
}
```

## Computed Signals

Combine signals for derived state:

```typescript
@Injectable({ providedIn: 'root' })
export class TodoService extends PolystateService<TodoState> {
  //...

  // Computed signal (Angular 18+)
  activeCount = computed(() => {
    const todos = this.todos();
    return todos.filter((t) => !t.completed).length;
  });

  completedCount = computed(() => {
    const todos = this.todos();
    return todos.filter((t) => t.completed).length;
  });
}
```

## Testing

```typescript
import { TestBed } from '@angular/core/testing';
import { TodoService } from './todo.service';

describe('TodoService', () => {
  let service: TodoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TodoService],
    });
    service = TestBed.inject(TodoService);
  });

  it('should add a todo', async () => {
    await service.addTodo('Learn Polystate');

    const todos = service.todos();
    expect(todos).toHaveLength(1);
    expect(todos[0].text).toBe('Learn Polystate');
  });

  it('should toggle todo completion', async () => {
    await service.addTodo('Test');
    const todo = service.todos()[0];

    await service.toggleTodo(todo.id);

    expect(service.todos()[0].completed).toBe(true);
  });

  it('should filter todos', async () => {
    await service.addTodo('Active todo');
    await service.addTodo('Completed todo');

    const todos = service.todos();
    await service.toggleTodo(todos[1].id);

    await service.setFilter('active');
    expect(service.todos()[0].text).toBe('Active todo');

    await service.setFilter('completed');
    expect(service.todos()[0].text).toBe('Completed todo');
  });
});
```

## SSR Support (Angular Universal)

Polystate works with Angular Universal out of the box:

```typescript
import { renderModule } from '@angular/platform-server';
import { AppServerModule } from './app/app.server.module';

export default function render(req: Request): Promise<string> {
  const { origin } = new URL(req.url);

  // Services are created per-request
  return renderModule(AppServerModule, {
    document: getDocument(),
    url: `${origin}${req.url}`,
    providers: [
      // Provide any SSR-specific dependencies
    ],
  });
}
```

## Middleware Support

Use middleware in Angular services:

```typescript
import { persistMiddleware, loggerMiddleware } from '@polystate/core';

@Injectable({ providedIn: 'root' })
export class TodoService extends PolystateService<TodoState> {
  private todoStore = createStore<TodoState>({ todos: [] }, actions, {
    middleware: [loggerMiddleware(), persistMiddleware('todos')],
  });
}
```

## Performance Tips

1. **Use Signals for frequent updates**

   ```typescript
   // Fast updates
   count = this.select((state) => state.count);
   ```

2. **Use Observables for async operations**

   ```typescript
   // Works with RxJS operators
   todos$ = this.select$((state) => state.todos).pipe(debounceTime(300), distinctUntilChanged());
   ```

3. **Combine with computed()**

   ```typescript
   filtered = computed(() => {
     // Automatically tracks dependencies
     return this.todos().filter(...);
   });
   ```

4. **Avoid multiple signals in template**

   ```typescript
   // Single call
   state = this.select((state) => state);

   // Better
   count = this.select((state) => state.count);
   todos = this.select((state) => state.todos);
   ```

## Comparison with Other Solutions

### vs NgRx

- Simpler API
- Smaller bundle size
- Works with RxJS and Signals
- No boilerplate

### vs Akita

- Framework-agnostic core
- Better TypeScript inference
- Easier to test

### vs Elf

- More familiar API
- Works in React too
- Built-in async support

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

## License

MIT
