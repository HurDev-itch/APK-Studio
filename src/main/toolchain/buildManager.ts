import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { toolchainManager } from './toolchainManager';
import { apktoolManager } from './apktoolManager';
import { eventBus } from '../core/eventBus';
import { commandBus } from '../core/commandBus';

export interface BuildOptions {
    workspacePath: string;
    outputApkPath: string;
    keystorePath?: string;
    keystorePass?: string;
    keyAlias?: string;
    keyPass?: string;
}

export class BuildManager {
    constructor() {
        this.registerCommands();
    }

    private registerCommands() {
        commandBus.register('build.run', async (options: BuildOptions) => {
            // Let errors propagate to commandBus which wraps in { success: false, error }
            return this.buildAndSign(options);
        });
    }

    public async buildAndSign(options: BuildOptions): Promise<string> {
        // Step 1: Rebuild with Apktool
        const unsignedName = path.basename(options.workspacePath) + '_unsigned.apk';
        const unsignedApkPath = path.join(options.workspacePath, 'dist', unsignedName);
        
        // Ensure dist directory exists
        const distDir = path.join(options.workspacePath, 'dist');
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
        }

        await apktoolManager.build(options.workspacePath, unsignedApkPath);

        // Step 2: Sign and Align with Uber-APK-Signer
        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\r\n\x1b[1;36m━━━ Signing APK ━━━\x1b[0m\r\n` });
        
        const javaPath = toolchainManager.getJavaPath();
        const signerPath = toolchainManager.getSignerPath();

        if (!fs.existsSync(signerPath)) {
            throw new Error('Uber-APK-Signer is not installed. Please download toolchains first.');
        }

        const args = [
            '-jar', signerPath,
            '-a', unsignedApkPath,
            '-o', distDir,
            '--overwrite'
        ];

        // If a keystore is provided, use it. Otherwise, uber-apk-signer uses a default debug keystore
        if (options.keystorePath && options.keystorePass && options.keyAlias && options.keyPass) {
            args.push(
                '--ks', options.keystorePath,
                '--ksAlias', options.keyAlias,
                '--ksPass', options.keystorePass,
                '--ksKeyPass', options.keyPass
            );
        }

        eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[90m$ java -jar uber-apk-signer.jar -a ${unsignedName}\x1b[0m\r\n\r\n` });

        return new Promise((resolve, reject) => {
            const child = spawn(javaPath, args, { cwd: options.workspacePath });

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
                    eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\r\n\x1b[32m✓ Build & Sign Pipeline Completed.\x1b[0m\r\n` });
                    eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[90mOutput: ${distDir}\x1b[0m\r\n` });
                    resolve(distDir);
                } else {
                    eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\r\n\x1b[31m✗ Signing failed with exit code ${code}.\x1b[0m\r\n` });
                    reject(new Error(`Uber-APK-Signer failed with code ${code}`));
                }
            });

            child.on('error', (err) => {
                eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[31mError launching Uber-APK-Signer: ${err.message}\x1b[0m\r\n` });
                reject(err);
            });
        });
    }
}

export const buildManager = new BuildManager();
