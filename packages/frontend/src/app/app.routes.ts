import { Routes } from '@angular/router';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { DashboardViewComponent } from './components/views/dashboard-view.component';
import { QueueViewComponent } from './components/views/queue-view.component';
import { HistoryViewComponent } from './components/views/history-view.component';
import { ModelsViewComponent } from './components/views/models-view.component';
import { RepoMapViewComponent } from './components/views/repomap-view.component';
import { ProcessesViewComponent } from './components/views/processes-view.component';
import { SettingsViewComponent } from './components/views/settings-view.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    component: DashboardViewComponent,
  },
  {
    path: 'queue',
    component: QueueViewComponent,
  },
  {
    path: 'history',
    component: HistoryViewComponent,
  },
  {
    path: 'models',
    component: ModelsViewComponent,
  },
  {
    path: 'repomap',
    component: RepoMapViewComponent,
  },
  {
    path: 'processes',
    component: ProcessesViewComponent,
  },
  {
    path: 'settings',
    component: SettingsViewComponent,
  },
  {
    path: 'auth/callback',
    component: AuthCallbackComponent,
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
