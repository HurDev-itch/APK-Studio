import { spawn, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { toolchainManager } from './toolchainManager';
import { eventBus } from '../core/eventBus';
import { commandBus } from '../core/commandBus';

export interface DeviceInfo {
    id: string;
    state: string;
    model: string;
    product: string;
    transportId: string;
}

export class AdbManager {
    constructor() {
        this.registerCommands();
    }

    private registerCommands() {
        commandBus.register('adb.devices', async () => {
            return this.getDevices();
        });

        commandBus.register('adb.install', async (args: { deviceId?: string, apkPath: string }) => {
            await this.installApk(args.deviceId, args.apkPath);
            return { success: true };
        });

        commandBus.register('adb.shell', async (args: { deviceId: string, command: string }) => {
            return this.shell(args.deviceId, args.command);
        });
    }

    public getDevices(): Promise<DeviceInfo[]> {
        return new Promise((resolve, reject) => {
            const adbPath = toolchainManager.getAdbPath();
            if (!fs.existsSync(adbPath)) {
                return reject(new Error('ADB is not installed. Please download toolchains first.'));
            }

            exec(`"${adbPath}" devices -l`, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`adb devices failed: ${stderr || error.message}`));
                }

                const lines = stdout.split('\n');
                const devices: DeviceInfo[] = [];

                // Skip first line ("List of devices attached")
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    // Example line: emulator-5554          device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:1
                    const parts = line.split(/\s+/);
                    if (parts.length >= 2) {
                        const id = parts[0];
                        const state = parts[1];
                        
                        let model = 'Unknown';
                        let product = 'Unknown';
                        let transportId = 'Unknown';

                        for (const part of parts.slice(2)) {
                            if (part.startsWith('model:')) model = part.substring(6);
                            if (part.startsWith('product:')) product = part.substring(8);
                            if (part.startsWith('transport_id:')) transportId = part.substring(13);
                        }

                        devices.push({ id, state, model, product, transportId });
                    }
                }

                resolve(devices);
            });
        });
    }

    public installApk(deviceId: string | undefined, apkPath: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const adbPath = toolchainManager.getAdbPath();
            
            const args = [];
            if (deviceId) {
                args.push('-s', deviceId);
                eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[36m$ adb -s ${deviceId} install -r "${path.basename(apkPath)}"\x1b[0m\r\n` });
            } else {
                eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[36m$ adb install -r "${path.basename(apkPath)}"\x1b[0m\r\n` });
            }
            
            args.push('install', '-r', apkPath);

            const child = spawn(adbPath, args);

            child.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (line.trim()) eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `${line.trim()}\r\n` });
                }
            });

            child.stderr.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (line.trim()) eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[33m${line.trim()}\x1b[0m\r\n` });
                }
            });

            child.on('close', (code) => {
                if (code === 0) {
                    eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[32mAPK Installed Successfully.\x1b[0m\r\n` });
                    resolve(true);
                } else {
                    eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[31mInstall failed with code ${code}.\x1b[0m\r\n` });
                    reject(new Error(`adb install failed with code ${code}`));
                }
            });
        });
    }

    public shell(deviceId: string, command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const adbPath = toolchainManager.getAdbPath();
            exec(`"${adbPath}" -s ${deviceId} shell ${command}`, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(stderr || error.message));
                }
                resolve(stdout.trim());
            });
        });
    }
}

export const adbManager = new AdbManager();
