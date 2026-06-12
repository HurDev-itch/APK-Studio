import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { toolchainManager } from './toolchainManager';
import { eventBus } from '../core/eventBus';
import { commandBus } from '../core/commandBus';

export class ApktoolManager {
    constructor() {
        this.registerCommands();
    }

    private registerCommands() {
        commandBus.register('apktool.decompile', async (args: { apkPath: string, outputDir: string }) => {
            return this.decompile(args.apkPath, args.outputDir);
        });

        commandBus.register('apktool.build', async (args: { projectDir: string, outputApk: string }) => {
            return this.build(args.projectDir, args.outputApk);
        });
    }

    public decompile(apkPath: string, outputDir: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const javaPath = toolchainManager.getJavaPath();
            const apktoolPath = toolchainManager.getApktoolPath();

            if (!fs.existsSync(apktoolPath)) {
                return reject(new Error('APKTool is not installed. Please download toolchains first.'));
            }

            eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\r\n\x1b[1;36m━━━ Decompiling APK ━━━\x1b[0m\r\n` });
            eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[90m$ java -jar apktool.jar d "${path.basename(apkPath)}" -o "${path.basename(outputDir)}" -f\x1b[0m\r\n\r\n` });

            const args = ['-jar', apktoolPath, 'd', apkPath, '-o', outputDir, '-f'];
            const child = spawn(javaPath, args, { cwd: path.dirname(apkPath) });

            child.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `${line.trim()}\r\n` });
                    }
                }
            });

            child.stderr.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[31m${line.trim()}\x1b[0m\r\n` });
                    }
                }
            });

            child.on('close', (code) => {
                if (code === 0) {
                    eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\r\n\x1b[32m✓ Decompilation finished successfully.\x1b[0m\r\n` });
                    resolve(true);
                } else {
                    eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\r\n\x1b[31m✗ Decompilation failed with exit code ${code}.\x1b[0m\r\n` });
                    reject(new Error(`Decompilation failed with code ${code}`));
                }
            });

            child.on('error', (err) => {
                eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[31mError launching apktool: ${err.message}\x1b[0m\r\n` });
                reject(err);
            });
        });
    }

    public build(projectDir: string, outputApk: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const javaPath = toolchainManager.getJavaPath();
            const apktoolPath = toolchainManager.getApktoolPath();

            if (!fs.existsSync(apktoolPath)) {
                return reject(new Error('APKTool is not installed. Please download toolchains first.'));
            }

            eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\r\n\x1b[1;36m━━━ Building APK ━━━\x1b[0m\r\n` });
            eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[90m$ java -jar apktool.jar b "${path.basename(projectDir)}" -o "${path.basename(outputApk)}"\x1b[0m\r\n\r\n` });

            const args = ['-jar', apktoolPath, 'b', projectDir, '-o', outputApk];
            const child = spawn(javaPath, args, { cwd: path.dirname(projectDir) });

            child.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `${line.trim()}\r\n` });
                    }
                }
            });

            child.stderr.on('data', (data) => {
                const lines = data.toString().split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[31m${line.trim()}\x1b[0m\r\n` });
                    }
                }
            });

            child.on('close', (code) => {
                if (code === 0) {
                    eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\r\n\x1b[32m✓ Build finished successfully.\x1b[0m\r\n` });
                    resolve(true);
                } else {
                    eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\r\n\x1b[31m✗ Build failed with exit code ${code}.\x1b[0m\r\n` });
                    reject(new Error(`Build failed with code ${code}`));
                }
            });

            child.on('error', (err) => {
                eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[31mError launching apktool: ${err.message}\x1b[0m\r\n` });
                reject(err);
            });
        });
    }
}

export const apktoolManager = new ApktoolManager();
