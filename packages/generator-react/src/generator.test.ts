import { describe, expect, it } from 'vitest';
import todoDefinition from '../../../examples/react-todo-generated/store.definition';
import { generateHooks, generateReduxStore, generateTypes } from './generator';

describe('generator-react', () => {
  describe('generateReduxStore', () => {
    it('includes all action names in reducers', () => {
      const output = generateReduxStore(todoDefinition);
      expect(output).toContain('addTodo');
      expect(output).toContain('toggleTodo');
      expect(output).toContain('removeTodo');
      expect(output).toContain('setFilter');
    });

    it('includes configureStore', () => {
      const output = generateReduxStore(todoDefinition);
      expect(output).toContain('configureStore');
    });

    it('imports PayloadAction from @reduxjs/toolkit', () => {
      const output = generateReduxStore(todoDefinition);
      expect(output).toContain("from '@reduxjs/toolkit'");
      expect(output).toContain('PayloadAction');
    });

    it('addTodo reducer is not a stub — contains push or spread logic', () => {
      const output = generateReduxStore(todoDefinition);
      // Extract only the reducers block
      const reducersStart = output.indexOf('reducers: {');
      const reducersBlock = output.slice(reducersStart);
      const addTodoStart = reducersBlock.indexOf('addTodo:');
      const addTodoSnippet = reducersBlock.slice(addTodoStart, addTodoStart + 300);
      // Should contain real logic (push for Immer) or spread, not just `return state`
      const isStub = /addTodo:\s*\(state(?:,\s*action)?\)\s*=>\s*\{\s*return\s+state;\s*\}/.test(
        addTodoSnippet
      );
      expect(isStub).toBe(false);
    });

    it('addTodo reducer references Date.now() and title', () => {
      const output = generateReduxStore(todoDefinition);
      expect(output).toContain('Date.now()');
      // The payload param should be referenced
      expect(output).toMatch(/title|action\.payload/);
    });

    it('generates createSlice with the store name', () => {
      const output = generateReduxStore(todoDefinition);
      expect(output).toContain("name: 'todo'");
      expect(output).toContain('todoSlice');
    });

    it('generates selectors', () => {
      const output = generateReduxStore(todoDefinition);
      expect(output).toContain('selectTodos');
      expect(output).toContain('selectFilter');
    });
  });

  describe('generateHooks', () => {
    it('includes useTodoDispatch hook', () => {
      const output = generateHooks(todoDefinition);
      expect(output).toContain('useTodoDispatch');
    });

    it('includes all action dispatchers', () => {
      const output = generateHooks(todoDefinition);
      expect(output).toContain('addTodo');
      expect(output).toContain('toggleTodo');
      expect(output).toContain('removeTodo');
      expect(output).toContain('setFilter');
    });

    it('imports from React and redux', () => {
      const output = generateHooks(todoDefinition);
      expect(output).toContain("from 'react-redux'");
      expect(output).toContain("from 'react'");
    });

    it('includes useTodoState hook', () => {
      const output = generateHooks(todoDefinition);
      expect(output).toContain('useTodoState');
    });
  });

  describe('generateTypes', () => {
    it('generates TodoState interface', () => {
      const output = generateTypes(todoDefinition);
      expect(output).toContain('TodoState');
    });

    it('includes todos and filter fields', () => {
      const output = generateTypes(todoDefinition);
      expect(output).toContain('todos');
      expect(output).toContain('filter');
    });
  });
});
