import { Routes } from '@angular/router';
import { MainGameComponent } from './components/main-game/main-game.component';
import { AdminComponent } from './components/admin/admin.component';

export const routes: Routes = [
  { path: '', component: MainGameComponent },
  { path: 'admin', component: AdminComponent },
  { path: '**', redirectTo: '' }
];