import { Routes } from '@angular/router';
import { LoginPage } from './login/login.page';
import { PropertiesPage } from './properties/properties.page';
import { authGuard } from '../guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginPage },
  { path: 'properties', component: PropertiesPage, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' },
];
