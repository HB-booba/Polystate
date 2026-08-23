import 'zone.js';
import '@angular/compiler';
import { getTestBed, TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { createAngularService } from './service';

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

interface TodoState {
  todos: Array<{ id: number; text: string; done: boolean }>;
  filter: 'all' | 'active' | 'done';
}

const initialState: TodoState = { todos: [], filter: 'all' };

const actions = {
  addTodo: (s: TodoState, text: string) => ({
    ...s,
    todos: [...s.todos, { id: Date.now(), text, done: false }],
  }),
  setFilter: (s: TodoState, f: 'all' | 'active' | 'done') => ({ ...s, filter: f }),
};

class TodoService extends createAngularService(initialState, actions) {}

function makeSvc(): TodoService {
  TestBed.configureTestingModule({ providers: [TodoService] });
  return TestBed.inject(TodoService);
}

describe('@polystate/angular — PolystateService.select (Angular Signal)', () => {
  let svc: TodoService;

  beforeEach(() => {
    svc = makeSvc();
  });

  it('returns the initial value as an Angular Signal', () => {
    const filter = svc.select((s) => s.filter);
    expect(typeof filter).toBe('function');
    expect(filter()).toBe('all');
  });

  it('updates the signal when dispatch() is called', async () => {
    const filter = svc.select((s) => s.filter);
    expect(filter()).toBe('all');

    await svc.dispatch('setFilter', 'active');
    expect(filter()).toBe('active');
  });

  it('creates independent signals for multiple selectors on the same service', async () => {
    const filter = svc.select((s) => s.filter);
    const todoCount = svc.select((s) => s.todos.length);

    expect(filter()).toBe('all');
    expect(todoCount()).toBe(0);

    await svc.dispatch('setFilter', 'done');
    expect(filter()).toBe('done');
    expect(todoCount()).toBe(0);

    await svc.dispatch('addTodo', 'Write tests');
    expect(todoCount()).toBe(1);
    expect(filter()).toBe('done');
  });

  it('stops updating the signal after ngOnDestroy()', async () => {
    const filter = svc.select((s) => s.filter);
    expect(filter()).toBe('all');

    svc.ngOnDestroy();
    await svc.dispatch('setFilter', 'active').catch(() => {});

    expect(filter()).toBe('all');
  });
});
