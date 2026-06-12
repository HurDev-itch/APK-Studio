export interface IUpdateProvider {
    checkForUpdates(): Promise<void>;
    downloadUpdate(): Promise<void>;
    installUpdate(): void;
    setChannel(channel: 'stable' | 'beta' | 'nightly'): void;
}
