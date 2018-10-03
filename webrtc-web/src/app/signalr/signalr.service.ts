import { Injectable } from '@angular/core';
import { BehaviorSubject, ReplaySubject, Subject, throwError, Observable, interval, asyncScheduler } from 'rxjs';
import { catchError, tap, filter, take, finalize } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { SignalrHubConnection } from './signalr-hub-connection';

export enum ConnectState {
  Disconnected = 'Disconnected',
  Connecting = 'Connecting',
  Connected = 'Connected'
}

@Injectable({
  providedIn: 'root'
})
export class SignalrService {
  get connectState$() {
    return this._connectStateSubject.asObservable();
  }

  get lastUpdateTime$() {
    return this._lastUpdateTime.asObservable();
  }

  private readonly _hubName = environment.signalrHub;
  private _hubConnection: SignalrHubConnection;
  private _connectStateSubject = new BehaviorSubject<ConnectState>(ConnectState.Disconnected);
  private _onMap = new Map<string, ReplaySubject<any>>();
  private _invokeMap = new Map<string, Subject<any>>();
  private _lastUpdateTime = new ReplaySubject<Date>(1);

  constructor() {
    this.createConnection();
  }

  getConnection(hubName: string) {
    return new SignalrHubConnection(hubName);
  }

  connect() {
    if (this._connectStateSubject.value === ConnectState.Disconnected) {
      this._connectStateSubject.next(ConnectState.Connecting);
      this._hubConnection
        .connect()
        .pipe(
          catchError(error => throwError(error))
        )
        .subscribe(
          () => {
            this._connectStateSubject.next(ConnectState.Connected);
          },
          error => {
            this._connectStateSubject.next(ConnectState.Disconnected);
          }
        );
    }

    return this._connectStateSubject.asObservable();
  }

  disconnect() {
    this._connectStateSubject.next(ConnectState.Disconnected);
    return this._hubConnection.disconnect();
  }

  on<T>(methodName: string) {
    console.log(`%c on ${methodName}`, 'color:green;font-size:16px;');
    let subject = this._onMap.get(methodName);

    if (!this._onMap.has(methodName)) {
      subject = new ReplaySubject<T>(1);
      this._onMap.set(methodName, subject);
      this._hubConnection
        .on<T>(methodName)
        .pipe(
          tap(() => this._lastUpdateTime.next(new Date())),
          tap(() => this.off(methodName))
        )
        .subscribe(subject);
      this.invoke(methodName);
    }

    return subject as Observable<T>;
  }

  off(methodName: string) {
    console.log(`%c off ${methodName}`, 'color:red;font-size:16px;');
    if (this._onMap.has(methodName)) {
      const subject = this._onMap.get(methodName);
      if (subject.observers.length < 1) {
        subject.complete();
        this._onMap.delete(methodName);
        return this._hubConnection.off(methodName);
      }
    }
    return throwError('Cannot off method because there have other subscribers!');
  }

  invoke<T>(methodName: string, ...args: any[]) {
    const key = `${methodName}-${args}`;
    let subject = this._invokeMap.get(key);

    if (!this._invokeMap.has(key)) {
      subject = new Subject<T>();
      this._invokeMap.set(key, subject);
      this.connect()
        .pipe(
          filter(state => state === ConnectState.Connected),
          take(1),
          tap(() => this._invokeMap.delete(key))
        )
        .subscribe(state => {
          this._hubConnection.invoke<T>(methodName, ...args).subscribe(subject);
        });
    } else {
      // it will trigger reconnect when disconnected
      this.connect();
    }

    return subject as Observable<T>;
  }

  private createConnection() {
    this._hubConnection = new SignalrHubConnection(this._hubName);
    console.log(this._hubConnection);

    this._hubConnection.hubConnection.onclose(error => {
      console.error(error);
      this.disconnect();
    });

    this.initHeartBeat();
  }

  private initHeartBeat() {
    this._hubConnection.on('HeartBeat');

    let isHeartBeating = false;
    const subscription = interval(30 * 1000, asyncScheduler)
      .pipe(
        filter(x => !isHeartBeating && this._connectStateSubject.value !== ConnectState.Connecting)
      )
      .subscribe(x => {
        isHeartBeating = true;
        this._hubConnection
          .invoke('HeartBeat')
          .pipe(
            finalize(() => {
              isHeartBeating = false;
              console.log(`%c invoke HeartBeat finally`, 'color:gray');
              if (this._connectStateSubject.value === ConnectState.Disconnected) {
                subscription.unsubscribe();
                this.reConnect();
              }
            })
          )
          .subscribe();
      });

    this.invoke('HeartBeat');
  }

  private reConnect() {
    this._hubConnection.disconnect();
    this.createConnection();
    this._onMap.forEach((subject, methodName) => {
      this._hubConnection
        .on(methodName)
        .pipe(
          tap(() => this._lastUpdateTime.next(new Date())),
          tap(() => this.off(methodName))
        )
        .subscribe(subject);
    });
    if (!this._onMap.size) {
      this.connect();
    }
  }
}
