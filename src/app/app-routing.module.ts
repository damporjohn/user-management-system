import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { AuthGuard } from './_helpers/auth.guard';
import { Role } from './_models/role';


const accountModule = () => import('./account/account.module').then(x => x.AccountModule);
const adminModule = () => import('./admin/admin.module').then(x => x.AdminModule);
const profileModule = () => import('./profile/profile.module').then(x => x.ProfileModule);

const routes: Routes = [
    { path: '', component: HomeComponent, canActivate: [AuthGuard] },
    { path: 'users', component: UserListComponent, canActivate: [AuthGuard], data: { roles: [Role.Admin] } },
    { path: 'account', loadChildren: () => import('./account/account.module').then(x => x.AccountModule) },
    { path: 'profile', loadChildren: () => import('./profile/profile.module').then(x => x.ProfileModule) },

    //otherwise redirect to home
    { path: '**', redirectTo: '' }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }