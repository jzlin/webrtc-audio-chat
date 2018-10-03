import { HubConnection, HubConnectionBuilder, LogLevel } from '@aspnet/signalr';
import { Observable, from, Subject } from 'rxjs';

export class SignalrHubConnection {
  private _hubConnection: HubConnection;

  get hubConnection() {
    return this._hubConnection;
  }

  constructor(hubName: string) {
    this._hubConnection = new HubConnectionBuilder()
      .withUrl(hubName)
      .configureLogging(LogLevel.Information)
      .build();
  }

  connect(): Observable<void> {
    return from(this._hubConnection.start());
  }

  disconnect(): void {
    this._hubConnection.stop();
  }

  on<T>(methodName: string): Observable<T> {
    const subject = new Subject<T>();

    this._hubConnection.on(methodName, (returnValue: T) => {
      subject.next(returnValue);
    });

    return subject.asObservable();
  }

  off(methodName: string) {
    const subject = new Subject<any>();

    this._hubConnection.off(methodName, returnValue => {
      subject.next(returnValue);
      subject.complete();
    });

    return subject.asObservable();
  }

  invoke<T>(methodName: string, ...args: any[]) {
    return from<T>(this._hubConnection.invoke(methodName, ...args));
  }
}
