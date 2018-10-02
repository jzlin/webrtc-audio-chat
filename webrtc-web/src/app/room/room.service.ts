import { Injectable } from '@angular/core';
import { from, throwError, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

import { SignalrService } from '../signalr/signalr.service';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  readonly mediaStreamConstraints = { audio: true };

  constructor(private signalrService: SignalrService) { }

  requestPermission() {
    return from(navigator.mediaDevices.getUserMedia(this.mediaStreamConstraints))
      .pipe(
        catchError(error => {
          // TODO: handle error
          return throwError(error);
        })
      );
  }

  enterRoom(name: string) {
    return this.signalrService.invoke('JoinGroup', name).pipe(
      tap(console.log),
      catchError(error => {
        // TODO: handle error
        return throwError(error);
      })
    );
  }

  leaveRoom(name: string) {
    return this.signalrService.invoke('LeaveGroup', name).pipe(
      tap(console.log),
      catchError(error => {
        // TODO: handle error
        return throwError(error);
      })
    );
  }

  call(name: string) {
    return this.signalrService.invoke('CallAction', name).pipe(
      tap(console.log),
      catchError(error => {
        // TODO: handle error
        return throwError(error);
      })
    );
  }

  listenOnCallAction(): Observable<any> {
    return this.signalrService.on<any>('OnCallAction').pipe(
      tap(console.log),
      catchError(error => {
        // TODO: handle error
        return throwError(error);
      })
    );
  }

  hangup(name: string, isLeaver: boolean, sdp: string) {
    return this.signalrService.invoke('HangupAction', name, { isLeaver, sdp }).pipe(
      tap(console.log),
      catchError(error => {
        // TODO: handle error
        return throwError(error);
      })
    );
  }

  listenOnHangupAction(): Observable<{ isLeaver: boolean, sdp: string }> {
    return this.signalrService.on<{ isLeaver: boolean, sdp: string }>('OnHangupAction').pipe(
      tap(console.log),
      catchError(error => {
        // TODO: handle error
        return throwError(error);
      })
    );
  }
}
