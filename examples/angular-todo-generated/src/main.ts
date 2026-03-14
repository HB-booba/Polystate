import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { bootstrapApplication } from '@angular/platform-browser';
import { StoreModule } from '@ngrx/store';
import { AppComponent } from './app/app.component';
import { TodoStoreModule } from './app/store/store.module';

bootstrapApplication(AppComponent, {
    providers: [
        StoreModule.forRoot({}),
        TodoStoreModule,
        CommonModule,
        FormsModule,
    ],
}).catch((err) => console.error(err));
