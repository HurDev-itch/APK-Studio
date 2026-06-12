import { autoUpdater } from 'electron-updater';
import { eventBus } from '../core/eventBus';
import type { IUpdateProvider } from './types';

export class GitHubUpdateProvider implements IUpdateProvider {
    constructor() {
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = false;

        // Forward events to frontend
        autoUpdater.on('update-available', (info) => {
            this.notifyFrontend('update-available', info);
        });

        autoUpdater.on('update-not-available', (info) => {
            this.notifyFrontend('update-not-available', info);
        });

        autoUpdater.on('download-progress', (progressObj) => {
            this.notifyFrontend('download-progress', progressObj);
        });

        autoUpdater.on('update-downloaded', (info) => {
            this.notifyFrontend('update-downloaded', info);
        });
        
        autoUpdater.on('error', (err) => {
            this.notifyFrontend('update-error', err.message);
        });
    }

    private notifyFrontend(channel: string, payload: any) {
        eventBus.publish({ type: channel, payload });
    }

    async checkForUpdates(): Promise<void> {
        try {
            await autoUpdater.checkForUpdates();
        } catch (e) {
            console.error('Check for updates failed', e);
        }
    }

    async downloadUpdate(): Promise<void> {
        try {
            await autoUpdater.downloadUpdate();
        } catch (e) {
            console.error('Download update failed', e);
        }
    }

    installUpdate(): void {
        autoUpdater.quitAndInstall();
    }

    setChannel(channel: 'stable' | 'beta' | 'nightly'): void {
        autoUpdater.channel = channel === 'stable' ? 'latest' : channel;
    }
}
