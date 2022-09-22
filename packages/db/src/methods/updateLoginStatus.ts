import type { ConnectStatus, IDatabase } from '../types';

export function updateLoginStatus(this: IDatabase, status: ConnectStatus) {
  this.loginStatus = status;
  if (status === 'ok') this.loggedIn = true;
  else this.loggedIn = false;
  if (this.onLoginStatusUpdate) this.onLoginStatusUpdate(status);
}
