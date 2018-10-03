import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { WebrtcService } from '../webrtc/webrtc.service';
import { RoomService } from './room.service';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit, OnDestroy {
  roomName: string;
  callButtonDisabled = false;
  hangupButtonDisabled = true;
  sender: RTCRtpSender;
  localStream: MediaStream;
  remoteStream: MediaStream;
  localPeerConnection: RTCPeerConnection;
  remotePeerConnection: RTCPeerConnection;

  private destory$ = new Subject();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private webrtcService: WebrtcService,
    private roomService: RoomService
  ) {
    this.route.params.subscribe(params => {
      const name = params.name;
      if (!name) {
        this.router.navigate(['room', 'default'], { relativeTo: this.route.root });
        return;
      }
      this.leaveRoom();
      this.roomName = name;
      this.roomService.requestPermission().subscribe(
        mediaStream => {
          this.localStream = mediaStream;
          this.roomService.enterRoom(this.roomName).subscribe();
        },
        error => {
          alert('You must allow the application to access your microphone');
          this.router.navigate(['start'], { relativeTo: this.route.root });
        }
      );
    });
  }

  ngOnInit() {
    this.listenOnIceCandidate();
    this.listenOnCreatedOffer();
    this.listenOnCreatedAnswer();
    this.listenOnCallAction();
    this.listenOnAcceptCall();
    this.listenOnHangupAction();
  }

  ngOnDestroy() {
    this.destory$.next();
    this.destory$.complete();
    this.leaveRoom();
  }

  log() {
    console.log(this.localPeerConnection, this.localStream);
    console.log(this.remotePeerConnection, this.remoteStream);
  }

  private listenOnIceCandidate() {
    this.webrtcService.listenOnIceCandidate()
      .pipe(
        takeUntil(this.destory$)
      )
      .subscribe(data => {
        // console.log(iceCandidate);
        // Receive IceCandidate from remote by SignalR
        console.log(data);
        console.log(`listenOnIceCandidate -> ${data.type}`);
        switch (data.type) {
          case 'offer':
            console.log('remotePeerConnection', this.remotePeerConnection);
            this.remotePeerConnection.addIceCandidate(data.iceCandidate);
            break;

          case 'answer':
            console.log('localPeerConnection', this.localPeerConnection);
            this.localPeerConnection.addIceCandidate(data.iceCandidate);
            break;
        }
      });
  }

  private listenOnCreatedOffer() {
    this.webrtcService.listenOnCreatedOffer()
      .pipe(
        takeUntil(this.destory$)
      )
      .subscribe(offerDescription => {
        // console.log(offerDescription);
        // Receive offerDescription from remote by SignalR
        this.remotePeerConnection.setRemoteDescription(offerDescription);

        this.webrtcService.createAnswer(this.remotePeerConnection).subscribe(
          answerDescription => {
            this.remotePeerConnection.setLocalDescription(answerDescription);

            // Send answerDescription to remote by SignalR
            this.webrtcService.createdAnswer(this.roomName, answerDescription).subscribe();
          }
        );
      });
  }

  private listenOnCreatedAnswer() {
    this.webrtcService.listenOnCreatedAnswer()
      .pipe(
        takeUntil(this.destory$)
      )
      .subscribe(answerDescription => {
        // console.log(answerDescription);
        // Receive answerDescription from remote by SignalR
        this.localPeerConnection.setRemoteDescription(answerDescription);
      });
  }

  private createRemotePeerConnection() {
    if (this.remotePeerConnection) {
      return;
    }
    this.remotePeerConnection = new RTCPeerConnection(this.webrtcService.servers);

    this.remotePeerConnection.addEventListener('icecandidate', this.handleConnection);
    this.remotePeerConnection.addEventListener('addstream', this.gotRemoteMediaStream);
    this.remotePeerConnection.addEventListener('removestream', this.removeRemoteMediaStream);

    (this.remotePeerConnection as any).addStream(this.localStream);
  }

  private gotRemoteMediaStream = (event: MediaStreamEvent) => {
    const mediaStream = event.stream;
    console.log('+++mediaStream', mediaStream);
    this.remoteStream = mediaStream;
  }

  private removeRemoteMediaStream = (event: MediaStreamEvent) => {
    const mediaStream = event.stream;
    console.log('---mediaStream', mediaStream);
    this.remoteStream = null;
  }

  private listenOnCallAction() {
    this.roomService.listenOnCallAction()
      .pipe(
        takeUntil(this.destory$)
      )
      .subscribe(data => {
        // Receive CallAction event from remote by SignalR
        console.log('[CallAction]');
        this.createRemotePeerConnection();
        this.acceptCall();
      });
  }

  private listenOnAcceptCall() {
    this.roomService.listenOnAcceptCall()
      .pipe(
        takeUntil(this.destory$)
      )
      .subscribe(data => {
        // Receive AcceptCall event from remote by SignalR
        console.log('[AcceptCall]');

        this.webrtcService.createOffer(this.localPeerConnection).subscribe(
          offerDescription => {
            this.localPeerConnection.setLocalDescription(offerDescription);

            // Send offerDescription to remote by SignalR
            this.webrtcService.createdOffer(this.roomName, offerDescription);
          }
        );
      });
  }

  private listenOnHangupAction() {
    this.roomService.listenOnHangupAction()
      .pipe(
        takeUntil(this.destory$)
      )
      .subscribe(data => {
        // Receive HangupAction event from remote by SignalR
        console.log('[HangupAction]');
        console.log('---close connection', this.remotePeerConnection);
        if (this.remotePeerConnection) {
          this.remotePeerConnection.close();
          this.remotePeerConnection = null;
        }
      });
  }

  private leaveRoom() {
    if (this.roomName) {
      this.roomService.leaveRoom(this.roomName).subscribe();
    }
  }

  call(isCaller = true) {
    this.callButtonDisabled = true;
    this.hangupButtonDisabled = false;

    // Get local media stream tracks.
    const audioTracks = this.localStream.getAudioTracks();
    console.log('audioTracks', audioTracks);

    // Create peer connections and add behavior.
    this.localPeerConnection = new RTCPeerConnection(this.webrtcService.servers);
    this.localPeerConnection.addEventListener('icecandidate', this.handleConnection);
    this.localPeerConnection.addEventListener('addstream', this.gotRemoteMediaStream);
    this.localPeerConnection.addEventListener('removestream', this.removeRemoteMediaStream);

    // Send CallAction event to remote with SignalR
    this.roomService.call(this.roomName, isCaller).subscribe();

    // Add local stream to connection and create offer to connect.
    // this.sender = this.localPeerConnection.addTrack(audioTracks[0], this.localStream);
    (this.localPeerConnection as any).addStream(this.localStream);
  }

  acceptCall(isCallee = true) {
    // Send AcceptCall event to remote by SignalR
    this.roomService.acceptCall(this.roomName, isCallee);
  }

  hangup(isLeaver = true) {
    // this.localPeerConnection.removeTrack(this.sender);
    (this.localPeerConnection as any).removeStream(this.localStream);

    // Send HangupAction event to remote by SignalR
    if (this.localPeerConnection.remoteDescription) {
      this.roomService.hangup(this.roomName, isLeaver, this.localPeerConnection.remoteDescription.sdp).subscribe();
    }

    this.localPeerConnection.close();
    this.localPeerConnection = null;
    this.hangupButtonDisabled = true;
    this.callButtonDisabled = false;
  }

  private handleConnection = (event: RTCPeerConnectionIceEvent) => {
    const peerConnection: RTCPeerConnection = event.target as any;
    const iceCandidate = event.candidate;

    if (iceCandidate) {
      // Send IceCandidate to remote by SignalR
      this.webrtcService.addIceCandidate(this.roomName, peerConnection, iceCandidate).subscribe();
    }
  }
}
