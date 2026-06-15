import { exec, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { commandBus } from '../core/commandBus';
import { eventBus } from '../core/eventBus';
import { sdkManager } from './sdkManager';

export interface AvdInfo {
    name: string;
    device: string;
    target: string;
    abi: string;
    status: 'offline' | 'running';
}

export interface AvdCreateConfig {
    name: string;
    device: string;          // e.g. "pixel_5"
    systemImage: string;     // e.g. "system-images;android-35;google_apis;x86_64"
    sdcard?: string;         // e.g. "512M"
    ram?: number;            // in MB
    internalStorage?: number; // in MB
}

export interface QuickSetupPreset {
    id: string;
    label: string;
    description: string;
    device: string;
    apiLevel: number;
    abi: string;
    ram: number;
    storage: number;
}

export class AvdManager {
    constructor() {
        this.registerCommands();
    }

    /**
     * Returns the list of quick setup presets.
     */
    public getPresets(): QuickSetupPreset[] {
        const abi = sdkManager.getDefaultAbi();
        return [
            {
                id: 'balanced',
                label: 'Balanced (Recommended)',
                description: 'Pixel 5 · Android 15 · 4 GB RAM',
                device: 'pixel_5',
                apiLevel: 35,
                abi,
                ram: 4096,
                storage: 8192,
            },
            {
                id: 'lightweight',
                label: 'Lightweight',
                description: 'Pixel 4 · Android 13 · 2 GB RAM',
                device: 'pixel_4',
                apiLevel: 33,
                abi,
                ram: 2048,
                storage: 4096,
            },
            {
                id: 'highend',
                label: 'High-End',
                description: 'Pixel 8 Pro · Android 16 · 8 GB RAM',
                device: 'pixel_8_pro',
                apiLevel: 36,
                abi,
                ram: 8192,
                storage: 16384,
            },
            {
                id: 'tablet',
                label: 'Tablet',
                description: 'Pixel Tablet · Android 15 · 6 GB RAM',
                device: 'pixel_tablet',
                apiLevel: 35,
                abi,
                ram: 6144,
                storage: 8192,
            },
        ];
    }

    /**
     * List all AVDs with their status.
     */
    public async listAvds(): Promise<AvdInfo[]> {
        const avdManagerPath = sdkManager.getAvdManagerPath();
        if (!fs.existsSync(avdManagerPath)) {
            return [];
        }

        const sdkRoot = sdkManager.getSdkRoot();

        return new Promise((resolve) => {
            exec(`"${avdManagerPath}" list avd`, {
                env: { ...process.env, ANDROID_SDK_ROOT: sdkRoot, ANDROID_HOME: sdkRoot },
                maxBuffer: 1024 * 1024,
            }, async (error, stdout) => {
                if (error) {
                    resolve([]);
                    return;
                }

                const avds: AvdInfo[] = [];
                const blocks = stdout.split(/\r?\n\r?\n/);

                for (const block of blocks) {
                    const nameMatch = block.match(/Name:\s*(.+)/i);
                    const deviceMatch = block.match(/Device:\s*(.+)/i);
                    const targetMatch = block.match(/Based on:\s*(.+)/i) || block.match(/Target:\s*(.+)/i);
                    const abiMatch = block.match(/Tag\/ABI:\s*(.+)/i);

                    if (nameMatch) {
                        avds.push({
                            name: nameMatch[1].trim(),
                            device: deviceMatch ? deviceMatch[1].trim() : 'Unknown',
                            target: targetMatch ? targetMatch[1].trim() : 'Unknown',
                            abi: abiMatch ? abiMatch[1].trim() : 'Unknown',
                            status: 'offline',
                        });
                    }
                }

                // Check which emulators are currently running
                const runningDevices = await this.getRunningEmulators();
                for (const avd of avds) {
                    if (runningDevices.includes(avd.name)) {
                        avd.status = 'running';
                    }
                }

                resolve(avds);
            });
        });
    }

    /**
     * Get running emulator AVD names by querying adb.
     */
    private async getRunningEmulators(): Promise<string[]> {
        const adbPath = this.getAdbPath();
        if (!adbPath || !fs.existsSync(adbPath)) return [];

        return new Promise((resolve) => {
            exec(`"${adbPath}" devices`, (error, stdout) => {
                if (error) { resolve([]); return; }

                const emulatorIds = stdout.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.startsWith('emulator-') && line.includes('device'))
                    .map(line => line.split(/\s+/)[0]);

                // For each running emulator, get its AVD name
                const namePromises = emulatorIds.map(id => {
                    return new Promise<string>((res) => {
                        exec(`"${adbPath}" -s ${id} emu avd name`, (err, out) => {
                            if (err) { res(''); return; }
                            res(out.split('\n')[0].trim());
                        });
                    });
                });

                Promise.all(namePromises).then(names => resolve(names.filter(n => n.length > 0)));
            });
        });
    }

    private getAdbPath(): string | null {
        const sdkRoot = sdkManager.getSdkRoot();
        const ext = process.platform === 'win32' ? '.exe' : '';
        const adbPath = path.join(sdkRoot, 'platform-tools', `adb${ext}`);
        if (fs.existsSync(adbPath)) return adbPath;
        
        // Fallback to toolchainManager's adb
        try {
            const { toolchainManager } = require('./toolchainManager');
            return toolchainManager.getAdbPath();
        } catch {
            return null;
        }
    }

    /**
     * Create a new AVD.
     */
    public async createAvd(config: AvdCreateConfig): Promise<void> {
        const avdManagerPath = sdkManager.getAvdManagerPath();
        if (!fs.existsSync(avdManagerPath)) {
            throw new Error('avdmanager not found. Please install SDK first.');
        }

        const sdkRoot = sdkManager.getSdkRoot();

        // Ensure the system image is installed
        this.publishProgress('create', `Ensuring system image is available...`, 10);
        try {
            await sdkManager.installPackage(config.systemImage);
        } catch (e) {
            // May already be installed
        }

        this.publishProgress('create', `Creating AVD "${config.name}"...`, 50);

        const args = [
            'create', 'avd',
            '-n', config.name,
            '-k', config.systemImage,
            '-d', config.device,
            '--force',
        ];

        return new Promise<void>((resolve, reject) => {
            const child = spawn(avdManagerPath, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
                env: { ...process.env, ANDROID_SDK_ROOT: sdkRoot, ANDROID_HOME: sdkRoot },
            });

            // Auto-accept hardware profile customization
            child.stdin.write('no\n');
            child.stdin.end();

            let output = '';
            child.stdout.on('data', (data: Buffer) => { output += data.toString(); });
            child.stderr.on('data', (data: Buffer) => { output += data.toString(); });

            child.on('close', (code) => {
                if (code === 0) {
                    // Apply RAM and storage config to the AVD's config.ini
                    this.configureAvdHardware(config);
                    this.publishProgress('create', `AVD "${config.name}" created successfully.`, 100);
                    resolve();
                } else {
                    reject(new Error(`Failed to create AVD (exit code ${code}): ${output}`));
                }
            });

            child.on('error', (err) => {
                reject(new Error(`Failed to create AVD: ${err.message}`));
            });
        });
    }

    /**
     * Modify the AVD config.ini to set RAM and storage.
     */
    private configureAvdHardware(config: AvdCreateConfig) {
        const avdDir = this.getAvdDir(config.name);
        if (!avdDir) return;

        const configPath = path.join(avdDir, 'config.ini');
        if (!fs.existsSync(configPath)) return;

        let content = fs.readFileSync(configPath, 'utf-8');

        if (config.ram) {
            if (content.includes('hw.ramSize=')) {
                content = content.replace(/hw\.ramSize=.*/g, `hw.ramSize=${config.ram}`);
            } else {
                content += `\nhw.ramSize=${config.ram}\n`;
            }
        }

        if (config.internalStorage) {
            if (content.includes('disk.dataPartition.size=')) {
                content = content.replace(/disk\.dataPartition\.size=.*/g, `disk.dataPartition.size=${config.internalStorage}M`);
            } else {
                content += `\ndisk.dataPartition.size=${config.internalStorage}M\n`;
            }
        }

        fs.writeFileSync(configPath, content, 'utf-8');
    }

    private getAvdDir(avdName: string): string | null {
        const avdHome = process.env.ANDROID_AVD_HOME || path.join(require('os').homedir(), '.android', 'avd');
        const dir = path.join(avdHome, `${avdName}.avd`);
        return fs.existsSync(dir) ? dir : null;
    }

    /**
     * Delete an AVD.
     */
    public async deleteAvd(name: string): Promise<void> {
        const avdManagerPath = sdkManager.getAvdManagerPath();
        if (!fs.existsSync(avdManagerPath)) {
            throw new Error('avdmanager not found.');
        }

        const sdkRoot = sdkManager.getSdkRoot();

        return new Promise<void>((resolve, reject) => {
            exec(`"${avdManagerPath}" delete avd -n "${name}"`, {
                env: { ...process.env, ANDROID_SDK_ROOT: sdkRoot, ANDROID_HOME: sdkRoot },
            }, (error, _stdout, stderr) => {
                if (error) {
                    reject(new Error(`Failed to delete AVD: ${stderr || error.message}`));
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Start an emulator with an AVD.
     */
    public async startAvd(avdName: string): Promise<void> {
        const sdkRoot = sdkManager.getSdkRoot();
        const ext = process.platform === 'win32' ? '.exe' : '';
        const emulatorPath = path.join(sdkRoot, 'emulator', `emulator${ext}`);

        if (!fs.existsSync(emulatorPath)) {
            throw new Error(`Emulator binary not found at ${emulatorPath}`);
        }

        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[36m$ emulator -avd ${avdName}\x1b[0m\r\n` });

        const child = spawn(emulatorPath, ['-avd', avdName], {
            detached: true,
            stdio: 'ignore',
            env: { ...process.env, ANDROID_SDK_ROOT: sdkRoot, ANDROID_HOME: sdkRoot },
        });
        child.unref();
    }

    /**
     * Snapshot operations.
     */
    public async saveSnapshot(deviceId: string, snapshotName: string = 'default'): Promise<void> {
        const adbPath = this.getAdbPath();
        if (!adbPath) throw new Error('ADB not found');

        return new Promise((resolve, reject) => {
            exec(`"${adbPath}" -s ${deviceId} emu avd snapshot save ${snapshotName}`, (err, _stdout, stderr) => {
                if (err) reject(new Error(stderr || err.message));
                else resolve();
            });
        });
    }

    public async loadSnapshot(deviceId: string, snapshotName: string = 'default'): Promise<void> {
        const adbPath = this.getAdbPath();
        if (!adbPath) throw new Error('ADB not found');

        return new Promise((resolve, reject) => {
            exec(`"${adbPath}" -s ${deviceId} emu avd snapshot load ${snapshotName}`, (err, _stdout, stderr) => {
                if (err) reject(new Error(stderr || err.message));
                else resolve();
            });
        });
    }

    public async wipeData(avdName: string): Promise<void> {
        const sdkRoot = sdkManager.getSdkRoot();
        const ext = process.platform === 'win32' ? '.exe' : '';
        const emulatorPath = path.join(sdkRoot, 'emulator', `emulator${ext}`);

        if (!fs.existsSync(emulatorPath)) throw new Error('Emulator not found');

        // Start emulator with -wipe-data flag, then kill it
        const child = spawn(emulatorPath, ['-avd', avdName, '-wipe-data', '-no-window', '-no-boot-anim'], {
            detached: true,
            stdio: 'ignore',
        });
        child.unref();

        // Wait a moment and then kill it — the wipe happens at startup
        await new Promise(resolve => setTimeout(resolve, 10000));
        try {
            child.kill();
        } catch {}
    }

    /**
     * Quick setup: full pipeline from zero to running emulator.
     */
    public async quickSetup(presetId: string = 'balanced'): Promise<string> {
        const preset = this.getPresets().find(p => p.id === presetId);
        if (!preset) throw new Error(`Unknown preset: ${presetId}`);

        const abi = preset.abi;
        const systemImage = `system-images;android-${preset.apiLevel};google_apis;${abi}`;
        const avdName = `${preset.device}_API_${preset.apiLevel}`.replace(/\s+/g, '_');

        this.publishProgress('quickSetup', 'Step 1/5: Bootstrapping SDK...', 0);
        await sdkManager.bootstrapSdk();

        this.publishProgress('quickSetup', 'Step 2/5: Accepting licenses...', 20);
        await sdkManager.acceptLicenses();

        this.publishProgress('quickSetup', 'Step 3/5: Installing required packages...', 30);
        const packages = [
            'platform-tools',
            'emulator',
            `platforms;android-${preset.apiLevel}`,
            systemImage,
        ];
        for (const pkg of packages) {
            this.publishProgress('quickSetup', `Installing ${pkg}...`, 40);
            await sdkManager.installPackage(pkg);
        }

        this.publishProgress('quickSetup', `Step 4/5: Creating AVD "${avdName}"...`, 75);
        await this.createAvd({
            name: avdName,
            device: preset.device,
            systemImage,
            ram: preset.ram,
            internalStorage: preset.storage,
        });

        this.publishProgress('quickSetup', 'Step 5/5: Starting emulator...', 90);
        await this.startAvd(avdName);

        this.publishProgress('quickSetup', 'Quick Setup complete! 🎉', 100);
        return avdName;
    }

    /**
     * Get connected physical devices via ADB.
     */
    public async getPhysicalDevices(): Promise<any[]> {
        const adbPath = this.getAdbPath();
        if (!adbPath || !fs.existsSync(adbPath)) return [];

        return new Promise((resolve) => {
            exec(`"${adbPath}" devices -l`, (error, stdout) => {
                if (error) { resolve([]); return; }

                const devices: any[] = [];
                const lines = stdout.split('\n').slice(1); // skip header

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('*')) continue;

                    const parts = trimmed.split(/\s+/);
                    const id = parts[0];
                    const state = parts[1]; // device, unauthorized, offline

                    // Skip emulators
                    if (id.startsWith('emulator-')) continue;

                    const modelMatch = trimmed.match(/model:(\S+)/);
                    const deviceMatch = trimmed.match(/device:(\S+)/);

                    devices.push({
                        id,
                        state,
                        model: modelMatch ? modelMatch[1].replace(/_/g, ' ') : id,
                        device: deviceMatch ? deviceMatch[1] : 'Unknown',
                    });
                }

                resolve(devices);
            });
        });
    }

    private publishProgress(step: string, message: string, percent: number) {
        eventBus.publish({
            type: 'SDK_INSTALL_PROGRESS',
            payload: { step, message, percent }
        });
    }

    private registerCommands() {
        commandBus.register('avd.list', async () => {
            return await this.listAvds();
        });

        commandBus.register('avd.create', async (config: AvdCreateConfig) => {
            await this.createAvd(config);
            return { success: true };
        });

        commandBus.register('avd.delete', async (name: string) => {
            await this.deleteAvd(name);
            return { success: true };
        });

        commandBus.register('avd.start', async (avdName: string) => {
            await this.startAvd(avdName);
            return { success: true };
        });

        commandBus.register('avd.quickSetup', async (presetId?: string) => {
            const avdName = await this.quickSetup(presetId || 'balanced');
            return { success: true, avdName };
        });

        commandBus.register('avd.getPresets', async () => {
            return this.getPresets();
        });

        commandBus.register('avd.saveSnapshot', async (args: { deviceId: string, name?: string }) => {
            await this.saveSnapshot(args.deviceId, args.name);
            return { success: true };
        });

        commandBus.register('avd.loadSnapshot', async (args: { deviceId: string, name?: string }) => {
            await this.loadSnapshot(args.deviceId, args.name);
            return { success: true };
        });

        commandBus.register('avd.wipeData', async (avdName: string) => {
            await this.wipeData(avdName);
            return { success: true };
        });

        commandBus.register('avd.getPhysicalDevices', async () => {
            return await this.getPhysicalDevices();
        });
    }
}

export const avdManager = new AvdManager();
