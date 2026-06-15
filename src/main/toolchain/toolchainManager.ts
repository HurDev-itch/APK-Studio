import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { commandBus } from '../core/commandBus';
import { eventBus } from '../core/eventBus';
import { DownloadManager } from './downloadManager';

export class ToolchainManager {
    private toolchainsPath: string;

    constructor() {
        this.toolchainsPath = path.join(app.getPath('userData'), 'toolchains');
        this.ensureDirectories();
        this.registerCommands();
    }

    private ensureDirectories() {
        const dirs = ['java', 'apktool', 'adb', 'signer'].map(d => path.join(this.toolchainsPath, d));
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    public getJavaPath(): string {
        const javaBin = process.platform === 'win32' ? 'java.exe' : 'java';
        // Temurin extraction usually creates a subfolder like jdk-17.0.x+y
        const javaDir = path.join(this.toolchainsPath, 'java');
        if (fs.existsSync(javaDir)) {
            const subdirs = fs.readdirSync(javaDir).filter(f => fs.statSync(path.join(javaDir, f)).isDirectory());
            if (subdirs.length > 0) {
                return path.join(javaDir, subdirs[0], 'bin', javaBin);
            }
        }
        return javaBin; // Fallback to system java
    }

    public getApktoolPath(): string {
        return path.join(this.toolchainsPath, 'apktool', 'apktool.jar');
    }

    public getSignerPath(): string {
        return path.join(this.toolchainsPath, 'signer', 'uber-apk-signer.jar');
    }

    public getAdbPath(): string {
        const adbBin = process.platform === 'win32' ? 'adb.exe' : 'adb';
        return path.join(this.toolchainsPath, 'adb', 'platform-tools', adbBin);
    }

    public getSdkPath(): string | null {
        try {
            const { sdkManager } = require('./sdkManager');
            return sdkManager.getSdkRoot();
        } catch {
            return null;
        }
    }

    private registerCommands() {
        commandBus.register('toolchain.downloadAll', async () => {
            try {
                await this.downloadJava();
                await this.downloadApkTool();
                await this.downloadSigner();
                await this.downloadAdb();
                return { success: true };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        });
        
        commandBus.register('toolchain.checkStatus', async () => {
            const status = {
                java: fs.existsSync(this.getJavaPath()) && this.getJavaPath() !== 'java.exe',
                apktool: fs.existsSync(this.getApktoolPath()),
                signer: fs.existsSync(this.getSignerPath()),
                adb: fs.existsSync(this.getAdbPath())
            };
            return status;
        });
    }

    private async downloadJava(): Promise<void> {
        if (fs.existsSync(this.getJavaPath()) && this.getJavaPath() !== 'java.exe') return;
        
        // Temurin 17 JRE (Windows x64)
        const url = 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk';
        const dest = path.join(this.toolchainsPath, 'java', 'jre.zip');
        
        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `Downloading Java 17 (Temurin JRE)...\r\n` });
        await DownloadManager.download({
            url,
            destFile: dest,
            extractTo: path.join(this.toolchainsPath, 'java'),
            onProgress: this.createProgressHandler('Java')
        });
        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[32mJava 17 downloaded and extracted.\x1b[0m\r\n` });
    }

    private async downloadApkTool(): Promise<void> {
        if (fs.existsSync(this.getApktoolPath())) return;
        
        const version = '2.9.3';
        const url = `https://github.com/iBotPeaches/Apktool/releases/download/v${version}/apktool_${version}.jar`;
        const dest = this.getApktoolPath();

        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `Downloading APKTool v${version}...\r\n` });
        await DownloadManager.download({
            url,
            destFile: dest,
            onProgress: this.createProgressHandler('APKTool')
        });
        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[32mAPKTool downloaded successfully.\x1b[0m\r\n` });
    }

    private async downloadSigner(): Promise<void> {
        if (fs.existsSync(this.getSignerPath())) return;
        
        const version = '1.3.0';
        const url = `https://github.com/patrickfav/uber-apk-signer/releases/download/v${version}/uber-apk-signer-${version}.jar`;
        const dest = this.getSignerPath();

        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `Downloading Uber-APK-Signer v${version}...\r\n` });
        await DownloadManager.download({
            url,
            destFile: dest,
            onProgress: this.createProgressHandler('Signer')
        });
        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[32mUber-APK-Signer downloaded successfully.\x1b[0m\r\n` });
    }

    private async downloadAdb(): Promise<void> {
        if (fs.existsSync(this.getAdbPath())) return;
        
        const url = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip';
        const dest = path.join(this.toolchainsPath, 'adb', 'platform-tools.zip');

        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `Downloading Platform Tools (ADB)...\r\n` });
        await DownloadManager.download({
            url,
            destFile: dest,
            extractTo: path.join(this.toolchainsPath, 'adb'),
            onProgress: this.createProgressHandler('ADB')
        });
        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[32mPlatform Tools downloaded and extracted.\x1b[0m\r\n` });
    }

    private createProgressHandler(name: string) {
        let lastPercent = 0;
        return (percent: number) => {
            if (percent > lastPercent + 10 || percent === 100) {
                lastPercent = percent;
                eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `[${name}] Download progress: ${percent}%\r\n` });
            }
        };
    }
}

export const toolchainManager = new ToolchainManager();
