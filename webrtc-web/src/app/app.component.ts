import { Component } from '@angular/core';

import { ConnectState, SignalrService } from './signalr/signalr.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  connectState = ConnectState;
  state: ConnectState;
  lastUpdateTime: Date;

  constructor(private signalrSvc: SignalrService) {
    this.signalrSvc.connectState$.subscribe(state => (this.state = state));
    this.signalrSvc.lastUpdateTime$.subscribe(time => (this.lastUpdateTime = time));
  }
}
