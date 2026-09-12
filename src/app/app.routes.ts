import { Routes } from '@angular/router';
import { MainGameComponent } from './components/main-game/main-game.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

export const routes: Routes = [
  { path: '', component: MainGameComponent },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin-section/admin/admin.component').then(m => m.AdminComponent)
  },
  {
    path: 'board-test',
    loadComponent: () => import('./components/board-test/board-test.component').then(m => m.BoardTestComponent)
  },
  {
    path: 'wiki',
    loadComponent: () => import('./components/admin-section/wiki/wiki.component').then(m => m.WikiComponent)
  },
  { path: '404', component: NotFoundComponent },
  { path: '**', redirectTo: '404' }
];