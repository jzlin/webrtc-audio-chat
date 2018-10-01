import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { SignalrService } from './signalr/signalr.service';
import { WebrtcService } from './webrtc/webrtc.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [
    SignalrService,
    WebrtcService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
