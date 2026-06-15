import { exec, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { app } from 'electron';
import { commandBus } from '../core/commandBus';
import { eventBus } from '../core/eventBus';
import { DownloadManager } from './downloadManager';

export interface SdkPackageInfo {
    name: string;
    version: string;
    description: string;
    installed: boolean;
}

const CMDLINE_TOOLS_URLS: Record<string, string> = {
    win32: 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip',
    darwin: 'https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip',
    linux: 'https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip',
};

export class SdkManager {
    private sdkRoot: string | null = null;

    constructor() {
        this.sdkRoot = this.detectSdkRoot();
        this.registerCommands();
    }

    /**
     * Detect SDK root using priority order:
     * 1. ANDROID_HOME
     * 2. ANDROID_SDK_ROOT
     * 3. %LOCALAPPDATA%\Android\Sdk (Windows default)
     * 4. ~/Android/Sdk (Linux/Mac default)
     * 5. Fall back to userData/toolchains/android-sdk
     */
    private detectSdkRoot(): string | null {
        // Check environment variables
        const envHome = process.env.ANDROID_HOME;
        if (envHome && fs.existsSync(envHome)) return envHome;

        const envSdkRoot = process.env.ANDROID_SDK_ROOT;
        if (envSdkRoot && fs.existsSync(envSdkRoot)) return envSdkRoot;

        // Check default locations
        if (process.platform === 'win32') {
            const localAppData = process.env.LOCALAPPDATA || '';
            const defaultWin = path.join(localAppData, 'Android', 'Sdk');
            if (fs.existsSync(defaultWin)) return defaultWin;
        } else if (process.platform === 'darwin') {
            const defaultMac = path.join(os.homedir(), 'Library', 'Android', 'sdk');
            if (fs.existsSync(defaultMac)) return defaultMac;
        } else {
            const defaultLinux = path.join(os.homedir(), 'Android', 'Sdk');
            if (fs.existsSync(defaultLinux)) return defaultLinux;
        }

        return null;
    }

    /**
     * Returns the SDK root, creating the private directory if needed.
     */
    public getSdkRoot(): string {
        if (this.sdkRoot) return this.sdkRoot;
        // Fall back to private SDK directory
        const privateSdk = path.join(app.getPath('userData'), 'toolchains', 'android-sdk');
        if (!fs.existsSync(privateSdk)) {
            fs.mkdirSync(privateSdk, { recursive: true });
        }
        this.sdkRoot = privateSdk;
        return privateSdk;
    }

    public getSdkManagerPath(): string {
        const sdkRoot = this.getSdkRoot();
        const ext = process.platform === 'win32' ? '.bat' : '';
        return path.join(sdkRoot, 'cmdline-tools', 'latest', 'bin', `sdkmanager${ext}`);
    }

    public getAvdManagerPath(): string {
        const sdkRoot = this.getSdkRoot();
        const ext = process.platform === 'win32' ? '.bat' : '';
        return path.join(sdkRoot, 'cmdline-tools', 'latest', 'bin', `avdmanager${ext}`);
    }

    public hasSdkManager(): boolean {
        return fs.existsSync(this.getSdkManagerPath());
    }

    /**
     * Get the default ABI based on host architecture.
     */
    public getDefaultAbi(): string {
        return process.arch === 'arm64' ? 'arm64-v8a' : 'x86_64';
    }

    /**
     * Bootstrap SDK: download command-line tools if not present.
     */
    public async bootstrapSdk(): Promise<void> {
        if (this.hasSdkManager()) {
            this.publishProgress('bootstrap', 'SDK command-line tools already installed.', 100);
            return;
        }

        const sdkRoot = this.getSdkRoot();
        const platform = process.platform as string;
        const url = CMDLINE_TOOLS_URLS[platform];
        if (!url) throw new Error(`Unsupported platform: ${platform}`);

        const destFile = path.join(sdkRoot, 'cmdline-tools-download.zip');
        const extractTo = path.join(sdkRoot, 'cmdline-tools-temp');

        this.publishProgress('bootstrap', 'Downloading SDK Command-Line Tools...', 0);

        let lastReportTime = 0;
        await DownloadManager.download({
            url,
            destFile,
            extractTo,
            onProgress: (percent, transferred, total) => {
                const now = Date.now();
                if (now - lastReportTime > 500 || percent === 100) {
                    lastReportTime = now;
                    const speed = transferred > 0 ? `${(transferred / 1024 / 1024).toFixed(1)} MB` : '';
                    const totalStr = total > 0 ? `${(total / 1024 / 1024).toFixed(1)} MB` : '';
                    this.publishProgress('bootstrap', `Downloading SDK Tools... ${speed} / ${totalStr}`, percent);
                }
            }
        });

        // Move extracted contents to correct location
        // The zip extracts to cmdline-tools-temp/cmdline-tools/ — we need it at cmdline-tools/latest/
        const latestDir = path.join(sdkRoot, 'cmdline-tools', 'latest');
        if (!fs.existsSync(path.join(sdkRoot, 'cmdline-tools'))) {
            fs.mkdirSync(path.join(sdkRoot, 'cmdline-tools'), { recursive: true });
        }

        const extractedInner = path.join(extractTo, 'cmdline-tools');
        if (fs.existsSync(extractedInner)) {
            fs.renameSync(extractedInner, latestDir);
        } else {
            // Some zips extract directly
            fs.renameSync(extractTo, latestDir);
        }

        // Clean up temp directory if it still exists
        if (fs.existsSync(extractTo)) {
            fs.rmSync(extractTo, { recursive: true, force: true });
        }

        this.publishProgress('bootstrap', 'SDK Command-Line Tools installed.', 100);
    }

    /**
     * Accept all SDK licenses automatically.
     */
    public async acceptLicenses(): Promise<void> {
        this.publishProgress('licenses', 'Accepting SDK licenses...', 0);

        const sdkManagerPath = this.getSdkManagerPath();
        const sdkRoot = this.getSdkRoot();

        return new Promise<void>((resolve, reject) => {
            const child = spawn(sdkManagerPath, ['--licenses', `--sdk_root=${sdkRoot}`], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
            });

            // Auto-accept by sending 'y' repeatedly
            child.stdin.write('y\ny\ny\ny\ny\ny\ny\ny\ny\ny\n');
            child.stdin.end();

            let output = '';
            child.stdout.on('data', (data: Buffer) => {
                output += data.toString();
            });
            child.stderr.on('data', (data: Buffer) => {
                output += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0 || output.includes('All SDK package licenses accepted')) {
                    this.publishProgress('licenses', 'All licenses accepted.', 100);
                    resolve();
                } else {
                    // Licenses may already be accepted, which is fine
                    this.publishProgress('licenses', 'Licenses processed.', 100);
                    resolve();
                }
            });

            child.on('error', (err) => {
                reject(new Error(`Failed to accept licenses: ${err.message}`));
            });
        });
    }

    /**
     * List installed and available SDK packages.
     */
    public async listPackages(): Promise<{ installed: SdkPackageInfo[], available: SdkPackageInfo[] }> {
        if (!this.hasSdkManager()) {
            return { installed: [], available: [] };
        }

        const sdkManagerPath = this.getSdkManagerPath();
        const sdkRoot = this.getSdkRoot();

        return new Promise((resolve, reject) => {
            exec(`"${sdkManagerPath}" --list --sdk_root="${sdkRoot}"`, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`Failed to list packages: ${stderr || error.message}`));
                }

                const installed: SdkPackageInfo[] = [];
                const available: SdkPackageInfo[] = [];
                let section: 'none' | 'installed' | 'available' = 'none';

                const lines = stdout.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('Installed packages:') || trimmed.startsWith('installed packages:')) {
                        section = 'installed';
                        continue;
                    }
                    if (trimmed.startsWith('Available Packages:') || trimmed.startsWith('available packages:')) {
                        section = 'available';
                        continue;
                    }
                    if (trimmed.startsWith('Available Updates:') || trimmed.startsWith('---')) {
                        continue;
                    }

                    // Parse package lines: "package-name | version | description"
                    const parts = trimmed.split('|').map(p => p.trim());
                    if (parts.length >= 2 && parts[0] && !parts[0].startsWith('Path')) {
                        const pkg: SdkPackageInfo = {
                            name: parts[0],
                            version: parts[1] || '',
                            description: parts[2] || parts[0],
                            installed: section === 'installed',
                        };
                        if (section === 'installed') installed.push(pkg);
                        else if (section === 'available') available.push(pkg);
                    }
                }

                resolve({ installed, available });
            });
        });
    }

    /**
     * Install a specific SDK package with progress streaming.
     */
    public async installPackage(packageName: string): Promise<void> {
        if (!this.hasSdkManager()) {
            throw new Error('SDK Manager not found. Please bootstrap SDK first.');
        }

        const sdkManagerPath = this.getSdkManagerPath();
        const sdkRoot = this.getSdkRoot();

        this.publishProgress('install', `Installing ${packageName}...`, 0);

        return new Promise<void>((resolve, reject) => {
            const child = spawn(sdkManagerPath, [packageName, `--sdk_root=${sdkRoot}`], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
            });

            // Auto-accept license prompts
            child.stdin.write('y\ny\ny\n');
            child.stdin.end();

            child.stdout.on('data', (data: Buffer) => {
                const text = data.toString();
                // Parse progress lines like "[===============                 ] 45%"
                const percentMatch = text.match(/(\d+)%/);
                if (percentMatch) {
                    const percent = parseInt(percentMatch[1], 10);
                    this.publishProgress('install', `Installing ${packageName}... ${percent}%`, percent);
                }

                // Stream to terminal
                eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: text });
            });

            child.stderr.on('data', (data: Buffer) => {
                eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: data.toString() });
            });

            child.on('close', (code) => {
                if (code === 0) {
                    this.publishProgress('install', `${packageName} installed successfully.`, 100);
                    resolve();
                } else {
                    reject(new Error(`Failed to install ${packageName} (exit code ${code})`));
                }
            });

            child.on('error', (err) => {
                reject(new Error(`Failed to install ${packageName}: ${err.message}`));
            });
        });
    }

    /**
     * Install default environment for running emulators.
     */
    public async installDefaultEnvironment(): Promise<void> {
        const abi = this.getDefaultAbi();
        const packages = [
            'platform-tools',
            'emulator',
            'platforms;android-35',
            `system-images;android-35;google_apis;${abi}`,
        ];

        for (let i = 0; i < packages.length; i++) {
            const pkg = packages[i];
            const overallPercent = Math.round(((i) / packages.length) * 100);
            this.publishProgress('environment', `Installing ${pkg}...`, overallPercent);
            await this.installPackage(pkg);
        }

        this.publishProgress('environment', 'Default environment installed.', 100);
    }

    private publishProgress(step: string, message: string, percent: number) {
        eventBus.publish({
            type: 'SDK_INSTALL_PROGRESS',
            payload: { step, message, percent }
        });
        eventBus.publish({
            type: 'BUILD_OUTPUT',
            payload: `[SDK] ${message}\r\n`
        });
    }

    private registerCommands() {
        commandBus.register('sdk.getRoot', async () => {
            return this.getSdkRoot();
        });

        commandBus.register('sdk.getStatus', async () => {
            return {
                sdkRoot: this.sdkRoot || this.getSdkRoot(),
                hasSdkManager: this.hasSdkManager(),
                defaultAbi: this.getDefaultAbi(),
            };
        });

        commandBus.register('sdk.bootstrap', async () => {
            await this.bootstrapSdk();
            return { success: true };
        });

        commandBus.register('sdk.acceptLicenses', async () => {
            await this.acceptLicenses();
            return { success: true };
        });

        commandBus.register('sdk.listPackages', async () => {
            return await this.listPackages();
        });

        commandBus.register('sdk.installPackage', async (packageName: string) => {
            await this.installPackage(packageName);
            return { success: true };
        });

        commandBus.register('sdk.installDefaultEnvironment', async () => {
            await this.installDefaultEnvironment();
            return { success: true };
        });
    }
}

export const sdkManager = new SdkManager();
