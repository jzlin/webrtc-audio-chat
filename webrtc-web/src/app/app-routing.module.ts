import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LocalComponent } from './clients/local/local.component';
import { RemoteComponent } from './clients/remote/remote.component';

const routes: Routes = [
  { path: '', redirectTo: 'local', pathMatch: 'full' },
  { path: 'local', component: LocalComponent },
  { path: 'remote', component: RemoteComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
