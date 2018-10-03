import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SignalrService } from './signalr/signalr.service';
import { WebrtcService } from './webrtc/webrtc.service';
import { RoomService } from './room/room.service';
import { StartComponent } from './start/start.component';
import { RoomComponent } from './room/room.component';

@NgModule({
  declarations: [
    AppComponent,
    StartComponent,
    RoomComponent
  ],
  imports: [
    FormsModule,
    BrowserModule,
    AppRoutingModule
  ],
  providers: [
    SignalrService,
    WebrtcService,
    RoomService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
