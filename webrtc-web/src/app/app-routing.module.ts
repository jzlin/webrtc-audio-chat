import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { StartComponent } from './start/start.component';
import { RoomComponent } from './room/room.component';
import { LocalComponent } from './clients/local/local.component';
import { RemoteComponent } from './clients/remote/remote.component';

const routes: Routes = [
  { path: '', redirectTo: 'start', pathMatch: 'full' },
  { path: 'start', component: StartComponent },
  { path: 'room/:name', component: RoomComponent },
  { path: 'local', component: LocalComponent },
  { path: 'remote', component: RemoteComponent },
  { path: '**', redirectTo: 'start' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
