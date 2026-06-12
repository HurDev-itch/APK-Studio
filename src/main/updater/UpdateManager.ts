import { commandBus } from '../core/commandBus';
import type { IUpdateProvider } from './types';
import { GitHubUpdateProvider } from './GitHubUpdateProvider';

export class UpdateManager {
    private provider: IUpdateProvider;

    constructor() {
        // Here we could instantiate different providers based on config
        this.provider = new GitHubUpdateProvider();
    }

    registerIPC() {
        commandBus.register('updater.checkForUpdates', async () => {
            await this.provider.checkForUpdates();
            return { success: true };
        });

        commandBus.register('updater.downloadUpdate', async () => {
            await this.provider.downloadUpdate();
            return { success: true };
        });

        commandBus.register('updater.installUpdate', async () => {
            this.provider.installUpdate();
            return { success: true };
        });

        commandBus.register('updater.setChannel', async (channel: 'stable' | 'beta' | 'nightly') => {
            this.provider.setChannel(channel);
            return { success: true };
        });
    }
}

export const updateManager = new UpdateManager();
