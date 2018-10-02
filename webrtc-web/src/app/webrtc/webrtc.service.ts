import { Injectable } from '@angular/core';
import { from, throwError, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

import { SignalrService } from '../signalr/signalr.service';

@Injectable({
  providedIn: 'root'
})
export class WebrtcService {
  readonly offerOptions: any = { offerToReceiveAudio: 1 };
  readonly servers: RTCConfiguration = {
    iceServers: [
        {urls: 'stun:stun.l.google.com:19302'}
    ]
  };

  constructor(private signalrService: SignalrService) { }

  addIceCandidate(groupName: string, peerConnection: RTCPeerConnection, iceCandidate: RTCIceCandidate) {
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    return this.signalrService.invoke('IceCandidate', groupName, {
      type: peerConnection.localDescription.type,
      sdp: peerConnection.localDescription.sdp,
      iceCandidate: newIceCandidate
    }).pipe(
      tap(console.log),
      catchError(error => {
        // TODO: handle error
        return throwError(error);
      })
    );
  }

  listenOnIceCandidate(): Observable<{ type: string, sdp: string, iceCandidate: RTCIceCandidate }> {
    return this.signalrService.on<{ type: string, sdp: string, iceCandidate: RTCIceCandidate }>('OnIceCandidate').pipe(
      tap(console.log),
      catchError(error => {
        // TODO: handle error
        return throwError(error);
      })
    );
  }

  createOffer(peerConnection: RTCPeerConnection): Observable<RTCSessionDescription> {
    return from(peerConnection.createOffer(this.offerOptions)).pipe(
      tap(console.log),
      catchError(error => {
        // TODO: handle error
        return throwError(error);
      })
    );
  }

  createdOffer(groupName: string, description: RTCSessionDescription) {
    return this.signalrService.invoke('CreatedOffer', groupName, description).pipe(
      tap(console.log),
      catchError(error => {
        // TODO: handle error
        return throwError(error);
      })
    );
  }

  listenOnCreatedOffer(): Observable<RTCSessionDescription> {
    return this.signalrService.on<RTCSessionDescription>('OnCreatedOffer').pipe(
      tap(console.log),
      catchError(error => {
        // TODO: handle error
        return throwError(error);
      })
    );
  }

  createAnswer(peerConnection: RTCPeerConnection): Observable<RTCSessionDescription> {
    return from(peerConnection.createAnswer()).pipe(
      tap(console.log),
      catchError(error => {
        // TODO: handle error
        return throwError(error);
      })
    );
  }

  createdAnswer(groupName: string, description: RTCSessionDescription) {
    return this.signalrService.invoke('CreatedAnswer', groupName, description).pipe(
      tap(console.log),
      catchError(error => {
        // TODO: handle error
        return throwError(error);
      })
    );
  }

  listenOnCreatedAnswer(): Observable<RTCSessionDescription> {
    return this.signalrService.on<RTCSessionDescription>('OnCreatedAnswer').pipe(
      tap(console.log),
      catchError(error => {
        // TODO: handle error
        return throwError(error);
      })
    );
  }
}
