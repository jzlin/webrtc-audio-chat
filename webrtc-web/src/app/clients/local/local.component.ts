import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SignalrService } from '../../signalr/signalr.service';

@Component({
  selector: 'app-local',
  templateUrl: './local.component.html',
  styleUrls: ['./local.component.scss']
})
export class LocalComponent implements OnInit, OnDestroy {
  mediaStreamConstraints = { audio: true };
  offerOptions = { offerToReceiveAudio: 1 };
  startTime = null;
  localAudioSrcObject;
  localStream;
  localPeerConnection;
  // remotePeerConnection;
  startButtonDisabled = false;
  callButtonDisabled = true;
  hangupButtonDisabled = true;

  private destory$ = new Subject();

  constructor(private signalrSvc: SignalrService) { }

  ngOnInit() {
    this.listenOnCreatedAnswer();
    this.listenOnIceCandidate();
  }

  ngOnDestroy() {
    this.destory$.next();
    this.destory$.complete();
  }

  private listenOnCreatedAnswer() {
    this.signalrSvc
      .on<any>('OnCreatedAnswer')
      .pipe(
        takeUntil(this.destory$)
      )
      .subscribe(description => {
        console.log(description);
        // Receive description from remote by SignalR
        this.trace('localPeerConnection setRemoteDescription start.');
        this.localPeerConnection.setRemoteDescription(description)
        .then(() => {
          this.setRemoteDescriptionSuccess(this.localPeerConnection);
        })
        .catch(this.setSessionDescriptionError);
      }, error => {
        console.error('OnCreatedAnswer Error!', error);
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
        if (data.From === 'Remote') {
          // Receive IceCandidate from remote by SignalR
          this.localPeerConnection.addIceCandidate(data.iceCandidate)
            .then(() => {
              this.handleConnectionSuccess(this.localPeerConnection);
            })
            .catch((error) => {
              this.handleConnectionFailure(this.localPeerConnection, error);
            });
        }
      }, error => {
        console.error('OnIceCandidate Error!', error);
      });
  }

  gotLocalMediaStream = (mediaStream) => {
    this.localAudioSrcObject = mediaStream;
    this.localStream = mediaStream;
    this.trace('Received local stream.');
    this.callButtonDisabled = false;  // Enable call button.
  }

  handleLocalMediaStreamError = (error) => {
    this.trace(`navigator.getUserMedia error: ${error.toString()}.`);
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
      // Send IceCandidate to remote by SignalR
      this.signalrSvc.invoke('IceCandidate', {
        From: 'Local',
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

  createdOffer = (description) => {
    this.trace(`Offer from localPeerConnection:\n${description.sdp}`);

    this.trace('localPeerConnection setLocalDescription start.');
    this.localPeerConnection.setLocalDescription(description)
      .then(() => {
        this.setLocalDescriptionSuccess(this.localPeerConnection);
      })
      .catch(this.setSessionDescriptionError);

    // Send description to remote by SignalR
    this.signalrSvc.invoke('CreatedOffer', description).subscribe();
  }

  startAction = () => {
    this.startButtonDisabled = true;
    navigator.mediaDevices.getUserMedia(this.mediaStreamConstraints)
      .then(this.gotLocalMediaStream)
      .catch(this.handleLocalMediaStreamError);
    this.trace('Requesting local stream.');
  }

  callAction = () => {
    this.callButtonDisabled = true;
    this.hangupButtonDisabled = false;

    this.trace('Starting call.');
    this.startTime = window.performance.now();

    // Get local media stream tracks.
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length > 0) {
      this.trace(`Using audio device: ${audioTracks[0].label}.`);
    }

    // const servers = null;  // Allows for RTC server configuration.
    const servers = {
        iceServers: [
            {urls: 'stun:stun.l.google.com:19302'}
        ]
    };

    // Create peer connections and add behavior.
    this.localPeerConnection = new RTCPeerConnection(servers);
    this.trace('Created local peer connection object localPeerConnection.');

    this.localPeerConnection.addEventListener('icecandidate', this.handleConnection);
    this.localPeerConnection.addEventListener('iceconnectionstatechange', this.handleConnectionChange);

    // Send CallAction event to remote with SignalR
    this.signalrSvc.invoke('CallAction');

    // Add local stream to connection and create offer to connect.
    this.localPeerConnection.addStream(this.localStream);
    this.trace('Added local stream to localPeerConnection.');

    this.trace('localPeerConnection createOffer start.');
    this.localPeerConnection.createOffer(this.offerOptions)
      .then(this.createdOffer)
      .catch(this.setSessionDescriptionError);
  }

  hangupAction = () => {
    this.localPeerConnection.close();
    this.localPeerConnection = null;
    this.hangupButtonDisabled = true;
    this.callButtonDisabled = false;
    // Send HangupAction event to remote by SignalR
    this.signalrSvc.invoke('HangupAction').subscribe();
    this.trace('Ending call.');
  }

  // getOtherPeer = (peerConnection) => {
  //   return (peerConnection === this.localPeerConnection) ?
  //   this.remotePeerConnection : this.localPeerConnection;
  // }

  getPeerName = (peerConnection) => {
    return (peerConnection === this.localPeerConnection) ?
      'localPeerConnection' : 'remotePeerConnection';
  }

  trace = (text) => {
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);

    console.log(now, text);
  }

}
