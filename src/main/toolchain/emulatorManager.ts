import { spawn, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { toolchainManager } from './toolchainManager';
import { eventBus } from '../core/eventBus';
import { commandBus } from '../core/commandBus';

export interface EmulatorInfo {
    name: string;
}

export class EmulatorManager {
    constructor() {
        this.registerCommands();
    }

    private getEmulatorPath(): string {
        // Find the emulator executable inside Android SDK
        const sdkPath = toolchainManager.getSdkPath();
        if (!sdkPath) {
            throw new Error('Android SDK path not found. Please install the SDK.');
        }
        const ext = process.platform === 'win32' ? '.exe' : '';
        const emulatorPath = path.join(sdkPath, 'emulator', `emulator${ext}`);
        if (!fs.existsSync(emulatorPath)) {
            throw new Error(`Emulator not found at ${emulatorPath}`);
        }
        return emulatorPath;
    }

    private registerCommands() {
        commandBus.register('emulator.list', async () => {
            return this.getEmulators();
        });

        commandBus.register('emulator.start', async (avdName: string) => {
            return this.startEmulator(avdName);
        });

        commandBus.register('emulator.stop', async (deviceId: string) => {
            return this.stopEmulator(deviceId);
        });

        commandBus.register('emulator.reboot', async (deviceId: string) => {
            // adb -s deviceId reboot
            const adbPath = toolchainManager.getAdbPath();
            return new Promise((resolve, reject) => {
                exec(`"${adbPath}" -s ${deviceId} reboot`, (err, _stdout, stderr) => {
                    if (err) reject(new Error(stderr || err.message));
                    else resolve({ success: true });
                });
            });
        });

        commandBus.register('emulator.launchApp', async (args: { deviceId: string, packageName: string, activityName: string }) => {
            const adbPath = toolchainManager.getAdbPath();
            return new Promise((resolve, reject) => {
                const component = `${args.packageName}/${args.activityName}`;
                exec(`"${adbPath}" -s ${args.deviceId} shell am start -n ${component}`, (err, _stdout, stderr) => {
                    if (err) reject(new Error(stderr || err.message));
                    else resolve({ success: true });
                });
            });
        });
        
        commandBus.register('emulator.takeScreenshot', async (args: { deviceId: string, outPath: string }) => {
            const adbPath = toolchainManager.getAdbPath();
            return new Promise((resolve, reject) => {
                exec(`"${adbPath}" -s ${args.deviceId} exec-out screencap -p > "${args.outPath}"`, (err, _stdout, stderr) => {
                    if (err) reject(new Error(stderr || err.message));
                    else resolve({ success: true });
                });
            });
        });
    }

    public getEmulators(): Promise<EmulatorInfo[]> {
        return new Promise((resolve, reject) => {
            try {
                const emulatorPath = this.getEmulatorPath();
                exec(`"${emulatorPath}" -list-avds`, (error, stdout, stderr) => {
                    if (error) {
                        return reject(new Error(`Failed to list AVDs: ${stderr || error.message}`));
                    }
                    const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    resolve(lines.map(name => ({ name })));
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    public startEmulator(avdName: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                const emulatorPath = this.getEmulatorPath();
                eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[36m$ emulator -avd ${avdName}\x1b[0m\r\n` });
                
                // Spawn detached so it stays running
                const child = spawn(emulatorPath, ['-avd', avdName], {
                    detached: true,
                    stdio: 'ignore'
                });
                
                child.unref();
                resolve(true);
            } catch (e) {
                reject(e);
            }
        });
    }

    public stopEmulator(deviceId: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const adbPath = toolchainManager.getAdbPath();
            exec(`"${adbPath}" -s ${deviceId} emu kill`, (err, _stdout, stderr) => {
                if (err) reject(new Error(stderr || err.message));
                else resolve(true);
            });
        });
    }
}

export const emulatorManager = new EmulatorManager();
