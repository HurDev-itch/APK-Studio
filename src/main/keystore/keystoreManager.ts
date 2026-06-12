import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { toolchainManager } from '../toolchain/toolchainManager';
import { eventBus } from '../core/eventBus';
import { commandBus } from '../core/commandBus';

export interface KeystoreOptions {
    keystorePath: string;
    storepass: string;
    alias: string;
    keypass: string;
    dname: string; // e.g. "CN=Unknown, OU=Unknown, O=Unknown, L=Unknown, ST=Unknown, C=Unknown"
    validity?: number;
    keyalg?: string;
    keysize?: number;
}

export class KeystoreManager {
    constructor() {
        this.registerCommands();
    }

    private registerCommands() {
        commandBus.register('keystore.generate', async (options: KeystoreOptions) => {
            await this.generateKeystore(options);
            return { success: true };
        });
    }

    public generateKeystore(options: KeystoreOptions): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // keytool is adjacent to java executable in the bin directory
            const javaPath = toolchainManager.getJavaPath();
            const keytoolBin = process.platform === 'win32' ? 'keytool.exe' : 'keytool';
            const keytoolPath = path.join(path.dirname(javaPath), keytoolBin);

            if (!fs.existsSync(keytoolPath) && javaPath !== 'java.exe') {
                return reject(new Error('keytool is not found in the Java bin directory.'));
            }

            // Using system java fallback if it's "java.exe"
            const finalKeytoolPath = javaPath === 'java.exe' || javaPath === 'java' ? keytoolBin : keytoolPath;

            const args = [
                '-genkeypair',
                '-v',
                '-keystore', options.keystorePath,
                '-alias', options.alias,
                '-keyalg', options.keyalg || 'RSA',
                '-keysize', (options.keysize || 2048).toString(),
                '-validity', (options.validity || 10000).toString(),
                '-storepass', options.storepass,
                '-keypass', options.keypass,
                '-dname', options.dname
            ];

            eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[36m$ keytool -genkeypair -alias ${options.alias} ...\x1b[0m\r\n` });

            const child = spawn(finalKeytoolPath, args);

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
                    eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[32mKeystore generated successfully at ${options.keystorePath}.\x1b[0m\r\n` });
                    resolve(true);
                } else {
                    eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[31mkeytool failed with code ${code}.\x1b[0m\r\n` });
                    reject(new Error(`keytool failed with code ${code}`));
                }
            });

            child.on('error', (err) => {
                eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[31mError launching keytool: ${err.message}\x1b[0m\r\n` });
                reject(err);
            });
        });
    }
}

export const keystoreManager = new KeystoreManager();
