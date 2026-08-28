import { Routes } from '@angular/router';
import { MainGameComponent } from './components/main-game/main-game.component';
import { AdminComponent } from './components/admin/admin.component';
import { WikiComponent } from './components/wiki/wiki.component';

export const routes: Routes = [
  { path: '', component: MainGameComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'wiki', component: WikiComponent },
  { path: '**', redirectTo: '' }
];