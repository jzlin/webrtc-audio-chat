import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SignalrService } from '../../signalr/signalr.service';

@Component({
  selector: 'app-remote',
  templateUrl: './remote.component.html',
  styleUrls: ['./remote.component.scss']
})
export class RemoteComponent implements OnInit, OnDestroy {
  mediaStreamConstraints = { audio: true };
  startTime = null;
  remoteAudioSrcObject;
  remoteStream;
  // localPeerConnection;
  remotePeerConnection;

  private destory$ = new Subject();

  constructor(private signalrSvc: SignalrService) { }

  ngOnInit() {
    this.listenOnCreatedOffer();
    this.listenOnIceCandidate();
    this.listenOnHangupAction();

    const servers = null;  // Allows for RTC server configuration.
    // const servers = {
    //     iceServers: [
    //         {urls: 'stun:stun.l.google.com:19302'}
    //     ]
    // };

    this.remotePeerConnection = new RTCPeerConnection(servers);
    this.trace('Created remote peer connection object remotePeerConnection.');

    this.remotePeerConnection.addEventListener('icecandidate', this.handleConnection);
    this.remotePeerConnection.addEventListener('iceconnectionstatechange', this.handleConnectionChange);
    this.remotePeerConnection.addEventListener('addstream', this.gotRemoteMediaStream);
  }

  ngOnDestroy() {
    this.destory$.next();
    this.destory$.complete();
  }

  private listenOnCreatedOffer() {
    this.signalrSvc
      .on<any>('OnCreatedOffer')
      .pipe(
        takeUntil(this.destory$)
      )
      .subscribe(description => {
        console.log(description);
        // Receive description from local by SignalR
        this.trace('remotePeerConnection setRemoteDescription start.');
        this.remotePeerConnection.setRemoteDescription(description)
          .then(() => {
            this.setRemoteDescriptionSuccess(this.remotePeerConnection);
          })
          .catch(this.setSessionDescriptionError);

        this.trace('remotePeerConnection createAnswer start.');
        this.remotePeerConnection.createAnswer()
          .then(this.createdAnswer)
          .catch(this.setSessionDescriptionError);
      }, error => {
        console.error('OnCreatedOffer Error!', error);
      });
  }

  private listenOnIceCandidate() {
    this.signalrSvc
      .on<any>('OnIceCandidate')
      .pipe(
        takeUntil(this.destory$)
      )
      .subscribe(data => {
        console.log(data);
        if (data.From === 'Local') {
          // Receive IceCandidate from local by SignalR
          this.remotePeerConnection.addIceCandidate(data.iceCandidate)
            .then(() => {
              this.handleConnectionSuccess(this.remotePeerConnection);
            })
            .catch((error) => {
              this.handleConnectionFailure(this.remotePeerConnection, error);
            });
        }
      }, error => {
        console.error('OnIceCandidate Error!', error);
      });
  }

  private listenOnHangupAction() {
    this.signalrSvc
      .on<any>('OnHangupAction')
      .pipe(
        takeUntil(this.destory$)
      )
      .subscribe(data => {
        console.log(data);
        // Receive HangupAction event from local by SignalR
        this.remotePeerConnection.close();
        this.remotePeerConnection = null;
      }, error => {
        console.error('OnHangupAction Error!', error);
      });
  }

  gotRemoteMediaStream = (event) => {
    const mediaStream = event.stream;
    this.remoteAudioSrcObject = mediaStream;
    this.remoteStream = mediaStream;
    this.trace('Remote peer connection received remote stream.');
  }

  logAudioLoaded = (event) => {
    const audio = event.target;
    this.trace(`${audio.id}`);
  }

  handleConnection = (event) => {
    const peerConnection = event.target;
    const iceCandidate = event.candidate;

    if (iceCandidate) {
      const newIceCandidate = new RTCIceCandidate(iceCandidate);
      // Send IceCandidate to local by SignalR
      this.signalrSvc.invoke('IceCandidate', {
        From: 'Remote',
        iceCandidate: newIceCandidate
      }).subscribe();

      this.trace(`${this.getPeerName(peerConnection)} ICE candidate:\n` +
            `${event.candidate.candidate}.`);
    }
  }

  handleConnectionSuccess = (peerConnection) => {
    this.trace(`${this.getPeerName(peerConnection)} addIceCandidate success.`);
  }

  handleConnectionFailure = (peerConnection, error) => {
    this.trace(`${this.getPeerName(peerConnection)} failed to add ICE Candidate:\n` +
          `${error.toString()}.`);
  }

  handleConnectionChange = (event) => {
    const peerConnection = event.target;
    console.log('ICE state change event: ', event);
    this.trace(`${this.getPeerName(peerConnection)} ICE state: ` +
          `${peerConnection.iceConnectionState}.`);
  }

  setSessionDescriptionError = (error) => {
    this.trace(`Failed to create session description: ${error.toString()}.`);
  }

  setDescriptionSuccess = (peerConnection, functionName) => {
    const peerName = this.getPeerName(peerConnection);
    this.trace(`${peerName} ${functionName} complete.`);
  }

  setLocalDescriptionSuccess = (peerConnection) => {
    this.setDescriptionSuccess(peerConnection, 'setLocalDescription');
  }

  setRemoteDescriptionSuccess = (peerConnection) => {
    this.setDescriptionSuccess(peerConnection, 'setRemoteDescription');
  }

  createdAnswer = (description) => {
    this.trace(`Answer from remotePeerConnection:\n${description.sdp}.`);

    this.trace('remotePeerConnection setLocalDescription start.');
    this.remotePeerConnection.setLocalDescription(description)
      .then(() => {
        this.setLocalDescriptionSuccess(this.remotePeerConnection);
      })
      .catch(this.setSessionDescriptionError);

    // Send description to local by SignalR
    this.signalrSvc.invoke('CreatedAnswer', description).subscribe();
  }

  // getOtherPeer = (peerConnection) => {
  //   return (peerConnection === this.localPeerConnection) ?
  //   this.remotePeerConnection : this.localPeerConnection;
  // }

  getPeerName = (peerConnection) => {
    return (peerConnection === this.remotePeerConnection) ?
      'remotePeerConnection' : 'localPeerConnection';
  }

  trace = (text) => {
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);

    console.log(now, text);
  }

}
