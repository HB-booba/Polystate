import { describe, expect, it } from 'vitest';
import todoDefinition from '../../../examples/angular-todo-generated/store.definition';
import {
  generateAngularFacade,
  generateNgRxActions,
  generateNgRxReducer,
  generateNgRxSelectors,
  generateNgRxState,
  generateStoreModule,
} from './generator';

describe('generator-angular', () => {
  describe('generateNgRxActions', () => {
    it('includes all action names', () => {
      const output = generateNgRxActions(todoDefinition);
      expect(output).toContain('addTodo');
      expect(output).toContain('toggleTodo');
      expect(output).toContain('removeTodo');
      expect(output).toContain('setFilter');
    });

    it('uses createAction and props from @ngrx/store', () => {
      const output = generateNgRxActions(todoDefinition);
      expect(output).toContain("from '@ngrx/store'");
      expect(output).toContain('createAction');
      expect(output).toContain('props');
    });

    it('payload actions include props<{ payload: any }>()', () => {
      const output = generateNgRxActions(todoDefinition);
      expect(output).toContain('props<{ payload: any }>()');
    });
  });

  describe('generateNgRxReducer', () => {
    it('includes all on() handlers', () => {
      const output = generateNgRxReducer(todoDefinition);
      expect(output).toContain('on(TodoActions.addTodo');
      expect(output).toContain('on(TodoActions.toggleTodo');
      expect(output).toContain('on(TodoActions.removeTodo');
      expect(output).toContain('on(TodoActions.setFilter');
    });

    it('imports createReducer and on from @ngrx/store', () => {
      const output = generateNgRxReducer(todoDefinition);
      expect(output).toContain("from '@ngrx/store'");
      expect(output).toContain('createReducer');
    });

    it('addTodo reducer is not a TODO stub', () => {
      const output = generateNgRxReducer(todoDefinition);
      expect(output).not.toContain('TODO: Implement reducer logic');
    });

    it('addTodo reducer contains real logic with Date.now() and title', () => {
      const output = generateNgRxReducer(todoDefinition);
      expect(output).toContain('Date.now()');
      expect(output).toMatch(/title|payload/);
    });

    it('reducer uses spread patterns (not Immer mutations)', () => {
      const output = generateNgRxReducer(todoDefinition);
      // NgRx reducers are pure — should use spread not push
      expect(output).toContain('...state');
      expect(output).not.toContain('.push(');
    });
  });

  describe('generateNgRxSelectors', () => {
    it('generates selector for each state field', () => {
      const output = generateNgRxSelectors(todoDefinition);
      expect(output).toContain('selectTodos');
      expect(output).toContain('selectFilter');
    });

    it('uses createFeatureSelector and createSelector', () => {
      const output = generateNgRxSelectors(todoDefinition);
      expect(output).toContain('createFeatureSelector');
      expect(output).toContain('createSelector');
    });
  });

  describe('generateNgRxState', () => {
    it('generates TodoState interface', () => {
      const output = generateNgRxState(todoDefinition);
      expect(output).toContain('TodoState');
    });

    it('includes todos and filter fields', () => {
      const output = generateNgRxState(todoDefinition);
      expect(output).toContain('todos');
      expect(output).toContain('filter');
    });
  });

  describe('generateAngularFacade', () => {
    it('generates TodoFacade class', () => {
      const output = generateAngularFacade(todoDefinition);
      expect(output).toContain('TodoFacade');
    });

    it('includes all action dispatch methods', () => {
      const output = generateAngularFacade(todoDefinition);
      expect(output).toContain('addTodo');
      expect(output).toContain('toggleTodo');
      expect(output).toContain('removeTodo');
      expect(output).toContain('setFilter');
    });

    it('includes Observable selectors for state fields', () => {
      const output = generateAngularFacade(todoDefinition);
      expect(output).toContain('todos$');
      expect(output).toContain('filter$');
    });

    it('uses @Injectable', () => {
      const output = generateAngularFacade(todoDefinition);
      expect(output).toContain('@Injectable');
    });
  });

  describe('generateStoreModule', () => {
    it('generates TodoStoreModule', () => {
      const output = generateStoreModule(todoDefinition);
      expect(output).toContain('TodoStoreModule');
    });

    it('registers the reducer with StoreModule.forFeature', () => {
      const output = generateStoreModule(todoDefinition);
      expect(output).toContain('StoreModule.forFeature');
      expect(output).toContain("'todo'");
      expect(output).toContain('todoReducer');
    });
  });
});
