/**
 * Generated NgRx Store Module for todo
 * Do not edit manually - regenerate with: polystate generate
 */

import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { todoReducer } from './reducer';

@NgModule({
    imports: [StoreModule.forFeature('todo', todoReducer)],
})
export class TodoStoreModule { }
