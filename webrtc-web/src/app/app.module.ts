import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SignalrService } from './signalr/signalr.service';
import { WebrtcService } from './webrtc/webrtc.service';
import { LocalComponent } from './clients/local/local.component';
import { RemoteComponent } from './clients/remote/remote.component';

@NgModule({
  declarations: [
    AppComponent,
    LocalComponent,
    RemoteComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [
    SignalrService,
    WebrtcService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
