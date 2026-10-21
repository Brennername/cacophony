import { Routes } from '@angular/router';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import {
  DashboardViewComponent,
  QueueViewComponent,
  HistoryViewComponent,
  ModelsViewComponent,
  RepoMapViewComponent,
  ProcessesViewComponent,
  SettingsViewComponent,
  FleetViewComponent,
  FleetTopologyViewComponent,
  TestingViewComponent,
} from './components/views';

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
    path: 'tasks/:id',
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
    path: 'fleet',
    component: FleetViewComponent,
  },
  {
    path: 'fleet/topology',
    component: FleetTopologyViewComponent,
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
    path: 'testing',
    component: TestingViewComponent,
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
