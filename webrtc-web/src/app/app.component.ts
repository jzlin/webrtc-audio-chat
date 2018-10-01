import { Component, ViewChild, ElementRef } from '@angular/core';

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

  // Set up media stream constant and parameters.

  // In this codelab, you will be streaming audio only: "audio: true".
  // Audio will not be streamed because it is set to "audio: false" by default.
  mediaStreamConstraints = {
    audio: true,
  };

  // Set up to exchange only audio.
  offerOptions = {
    offerToReceiveAudio: 1,
  };

  // Define initial start time of the call (defined as connection between peers).
  startTime = null;

  // Define peer connections, streams and audio elements.
  localAudioSrcObject;
  remoteAudioSrcObject;

  localStream;
  remoteStream;

  localPeerConnection;
  remotePeerConnection;

  // Define and add behavior to buttons.

  startButtonDisabled = false;
  callButtonDisabled = true;
  hangupButtonDisabled = true;

  constructor(private signalrSvc: SignalrService) {
    this.signalrSvc.connectState$.subscribe(state => (this.state = state));
    this.signalrSvc.lastUpdateTime$.subscribe(time => (this.lastUpdateTime = time));
  }

  // Define MediaStreams callbacks.

  // Sets the MediaStream as the audio element src.
  gotLocalMediaStream = (mediaStream) => {
    this.localAudioSrcObject = mediaStream;
    this.localStream = mediaStream;
    this.trace('Received local stream.');
    this.callButtonDisabled = false;  // Enable call button.
  }

  // Handles error by logging a message to the console.
  handleLocalMediaStreamError = (error) => {
    this.trace(`navigator.getUserMedia error: ${error.toString()}.`);
  }

  // Handles remote MediaStream success by adding it as the remoteAudio src.
  gotRemoteMediaStream = (event) => {
    const mediaStream = event.stream;
    this.remoteAudioSrcObject = mediaStream;
    this.remoteStream = mediaStream;
    this.trace('Remote peer connection received remote stream.');
  }


  // Add behavior for audio streams.

  // Logs a message with the id and size of a audio element.
  logAudioLoaded = (event) => {
    const audio = event.target;
    this.trace(`${audio.id}`);
  }

  // Define RTC peer connection behavior.

  // Connects with new peer candidate.
  handleConnection = (event) => {
    const peerConnection = event.target;
    const iceCandidate = event.candidate;

    if (iceCandidate) {
      const newIceCandidate = new RTCIceCandidate(iceCandidate);
      const otherPeer = this.getOtherPeer(peerConnection);

      otherPeer.addIceCandidate(newIceCandidate)
        .then(() => {
          this.handleConnectionSuccess(peerConnection);
        })
        .catch((error) => {
          this.handleConnectionFailure(peerConnection, error);
        });

      this.trace(`${this.getPeerName(peerConnection)} ICE candidate:\n` +
            `${event.candidate.candidate}.`);
    }
  }

  // Logs that the connection succeeded.
  handleConnectionSuccess = (peerConnection) => {
    this.trace(`${this.getPeerName(peerConnection)} addIceCandidate success.`);
  }

  // Logs that the connection failed.
  handleConnectionFailure = (peerConnection, error) => {
    this.trace(`${this.getPeerName(peerConnection)} failed to add ICE Candidate:\n` +
          `${error.toString()}.`);
  }

  // Logs changes to the connection state.
  handleConnectionChange = (event) => {
    const peerConnection = event.target;
    console.log('ICE state change event: ', event);
    this.trace(`${this.getPeerName(peerConnection)} ICE state: ` +
          `${peerConnection.iceConnectionState}.`);
  }

  // Logs error when setting session description fails.
  setSessionDescriptionError = (error) => {
    this.trace(`Failed to create session description: ${error.toString()}.`);
  }

  // Logs success when setting session description.
  setDescriptionSuccess = (peerConnection, functionName) => {
    const peerName = this.getPeerName(peerConnection);
    this.trace(`${peerName} ${functionName} complete.`);
  }

  // Logs success when localDescription is set.
  setLocalDescriptionSuccess = (peerConnection) => {
    this.setDescriptionSuccess(peerConnection, 'setLocalDescription');
  }

  // Logs success when remoteDescription is set.
  setRemoteDescriptionSuccess = (peerConnection) => {
    this.setDescriptionSuccess(peerConnection, 'setRemoteDescription');
  }

  // Logs offer creation and sets peer connection session descriptions.
  createdOffer = (description) => {
    this.trace(`Offer from localPeerConnection:\n${description.sdp}`);

    this.trace('localPeerConnection setLocalDescription start.');
    this.localPeerConnection.setLocalDescription(description)
      .then(() => {
        this.setLocalDescriptionSuccess(this.localPeerConnection);
      })
      .catch(this.setSessionDescriptionError);

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
  }

  // Logs answer to offer creation and sets peer connection session descriptions.
  createdAnswer = (description) => {
    this.trace(`Answer from remotePeerConnection:\n${description.sdp}.`);

    this.trace('remotePeerConnection setLocalDescription start.');
    this.remotePeerConnection.setLocalDescription(description)
      .then(() => {
        this.setLocalDescriptionSuccess(this.remotePeerConnection);
      })
      .catch(this.setSessionDescriptionError);

    this.trace('localPeerConnection setRemoteDescription start.');
    this.localPeerConnection.setRemoteDescription(description)
      .then(() => {
        this.setRemoteDescriptionSuccess(this.localPeerConnection);
      })
      .catch(this.setSessionDescriptionError);
  }

  // Handles start button action: creates local MediaStream.
  startAction = () => {
    this.startButtonDisabled = true;
    navigator.mediaDevices.getUserMedia(this.mediaStreamConstraints)
      .then(this.gotLocalMediaStream)
      .catch(this.handleLocalMediaStreamError);
    this.trace('Requesting local stream.');
  }

  // Handles call button action: creates peer connection.
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

    const servers = null;  // Allows for RTC server configuration.
    // const servers = {
    //     iceServers: [
    //         {urls: 'stun:stun.l.google.com:19302'}
    //     ]
    // };

    // Create peer connections and add behavior.
    this.localPeerConnection = new RTCPeerConnection(servers);
    this.trace('Created local peer connection object localPeerConnection.');

    this.localPeerConnection.addEventListener('icecandidate', this.handleConnection);
    this.localPeerConnection.addEventListener('iceconnectionstatechange', this.handleConnectionChange);

    this.remotePeerConnection = new RTCPeerConnection(servers);
    this.trace('Created remote peer connection object remotePeerConnection.');

    this.remotePeerConnection.addEventListener('icecandidate', this.handleConnection);
    this.remotePeerConnection.addEventListener('iceconnectionstatechange', this.handleConnectionChange);
    this.remotePeerConnection.addEventListener('addstream', this.gotRemoteMediaStream);

    // Add local stream to connection and create offer to connect.
    this.localPeerConnection.addStream(this.localStream);
    this.trace('Added local stream to localPeerConnection.');

    this.trace('localPeerConnection createOffer start.');
    this.localPeerConnection.createOffer(this.offerOptions)
      .then(this.createdOffer)
      .catch(this.setSessionDescriptionError);
  }

  // Handles hangup action: ends up call, closes connections and resets peers.
  hangupAction = () => {
    this.localPeerConnection.close();
    this.remotePeerConnection.close();
    this.localPeerConnection = null;
    this.remotePeerConnection = null;
    this.hangupButtonDisabled = true;
    this.callButtonDisabled = false;
    this.trace('Ending call.');
  }


  // Define helper functions.

  // Gets the "other" peer connection.
  getOtherPeer = (peerConnection) => {
    return (peerConnection === this.localPeerConnection) ?
    this.remotePeerConnection : this.localPeerConnection;
  }

  // Gets the name of a certain peer connection.
  getPeerName = (peerConnection) => {
    return (peerConnection === this.localPeerConnection) ?
        'localPeerConnection' : 'remotePeerConnection';
  }

  // Logs an action (text) and the time when it happened on the console.
  trace = (text) => {
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);

    console.log(now, text);
  }
}
