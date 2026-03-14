import { importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { StoreModule } from '@ngrx/store';
import { AppComponent } from './app/app.component';
import { TodoStoreModule } from './app/store/store.module';

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(
            StoreModule.forRoot({}),
            TodoStoreModule,
        ),
    ],
}).catch((err) => console.error(err));
