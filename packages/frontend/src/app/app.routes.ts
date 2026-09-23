import { Routes } from '@angular/router';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';

export const routes: Routes = [
  {
    path: 'auth/callback',
    component: AuthCallbackComponent,
  },
];
