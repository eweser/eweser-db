import type { MatrixClient } from 'matrix-js-sdk/lib';
import type {
  IKeyBackupInfo,
  IKeyBackupRestoreResult,
} from 'matrix-js-sdk/lib/crypto/keybackup';
import type { TrustInfo } from 'matrix-js-sdk/lib/crypto/backup';
import EventEmitter from 'events';
import { CryptoEvent } from 'matrix-js-sdk/lib/crypto';

export type { IKeyBackupInfo } from 'matrix-js-sdk/lib/crypto/keybackup';
import olm from '@matrix-org/olm';
export class MatrixCrypto extends EventEmitter {
  constructor(private client: MatrixClient) {
    window.Olm = olm;
    super();
    client.on(CryptoEvent.KeyBackupStatus, this.onKeyBackupStatus);
  }

  async init(): Promise<void> {
    await this.client.initCrypto();

    this.client.setCryptoTrustCrossSignedDevices(true);

    const userId = this.client.getUserId();
    if (userId) {
      await this.client.downloadKeys([userId]);
    }

    // We don't support verifications at the moment.
    this.client.setGlobalErrorOnUnknownDevices(false);
  }

  async isKeyBackupAvailable(): Promise<boolean> {
    return !!(await this.client.getKeyBackupVersion());
  }

  async getKeyBackupInfo(): Promise<IKeyBackupInfo | null> {
    return this.client.getKeyBackupVersion();
  }

  async connectToExistingKeyBackup(
    passphrase: string
  ): Promise<{ restoreResult: IKeyBackupRestoreResult; trustInfo: TrustInfo }> {
    const keyBackup = await this.client.getKeyBackupVersion();
    if (!keyBackup) {
      throw new Error('No key backup available');
    }

    // The semantics here look odd:
    // First we try and restore with the password which will throw an error if the password is wrong
    // Then we actually test to see if the backup was usable and throw an error if not

    const restoreResult = await this.client.restoreKeyBackupWithPassword(
      passphrase,
      undefined,
      undefined,
      keyBackup,
      {}
    );

    const trustInfo = await this.client.isKeyBackupTrusted(keyBackup);

    return { restoreResult, trustInfo };
  }

  isConnectedToKeyBackup(): boolean {
    return !!this.client.getKeyBackupEnabled();
  }

  async createNewKeyBackup(passphrase: string): Promise<string> {
    const keyInfo = await this.client.prepareKeyBackupVersion(passphrase);
    await this.client.createKeyBackupVersion(keyInfo);
    return keyInfo.recovery_key;
  }

  private onKeyBackupStatus(enabled: boolean) {
    this.emit('keyBackupStatus', this, enabled);
  }
}
