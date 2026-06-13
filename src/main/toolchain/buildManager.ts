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
        const startTime = Date.now();
        const projectName = path.basename(options.workspacePath);
        const unsignedName = `${projectName}_unsigned.apk`;
        const signedName = `${projectName}.apk`;
        
        const distDir = path.join(options.workspacePath, 'dist');
        const unsignedApkPath = path.join(distDir, unsignedName);
        const finalApkPath = path.join(distDir, signedName);
        
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
        }

        // Clean up previous artifacts
        if (fs.existsSync(unsignedApkPath)) fs.unlinkSync(unsignedApkPath);
        if (fs.existsSync(finalApkPath)) fs.unlinkSync(finalApkPath);

        const publishBuildEvent = (level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS', message: string) => {
            eventBus.publish({ 
                type: 'BUILD_OUTPUT', 
                payload: { timestamp: Date.now(), level, message }
            });
        };

        try {
            publishBuildEvent('INFO', `Starting build pipeline for ${projectName}...`);
            publishBuildEvent('INFO', `Rebuilding APK using Apktool...`);
            
            // Step 1: Rebuild with Apktool
            await apktoolManager.build(options.workspacePath, unsignedApkPath);
            
            // Step 2: Sign and Align with Uber-APK-Signer
            publishBuildEvent('SUCCESS', `APK generated successfully.`);
            publishBuildEvent('INFO', `Signing and Aligning APK...`);
            
            const javaPath = toolchainManager.getJavaPath();
            const signerPath = toolchainManager.getSignerPath();

            if (!fs.existsSync(signerPath)) {
                throw new Error('Uber-APK-Signer is not installed. Please download toolchains first.');
            }

            const args = [
                '-jar', signerPath,
                '-a', unsignedApkPath,
                '-o', distDir
            ];

            if (options.keystorePath && options.keystorePass && options.keyAlias && options.keyPass) {
                args.push(
                    '--ks', options.keystorePath,
                    '--ksAlias', options.keyAlias,
                    '--ksPass', options.keystorePass,
                    '--ksKeyPass', options.keyPass
                );
            }

            publishBuildEvent('INFO', `$ java -jar uber-apk-signer.jar -a ${unsignedName}`);

            await new Promise<void>((resolve, reject) => {
                const child = spawn(javaPath, args, { cwd: options.workspacePath });

                child.stdout.on('data', (data) => {
                    const lines = data.toString().split('\n');
                    for (const line of lines) {
                        if (line.trim()) publishBuildEvent('INFO', line.trim());
                    }
                });

                child.stderr.on('data', (data) => {
                    const lines = data.toString().split('\n');
                    for (const line of lines) {
                        if (line.trim()) publishBuildEvent('WARNING', line.trim());
                    }
                });

                child.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(`Uber-APK-Signer failed with exit code ${code}`));
                });

                child.on('error', reject);
            });

            // Cleanup & Rename
            const generatedSignedName = `${projectName}_unsigned-aligned-debugSigned.apk`; // default without custom keystore
            const generatedSignedNameCustom = `${projectName}_unsigned-aligned-signed.apk`; // default with custom keystore
            const possibleSignedPaths = [
                path.join(distDir, generatedSignedName),
                path.join(distDir, generatedSignedNameCustom)
            ];

            let foundSignedPath = '';
            for (const p of possibleSignedPaths) {
                if (fs.existsSync(p)) {
                    foundSignedPath = p;
                    break;
                }
            }

            if (!foundSignedPath) {
                // Fallback: Just look for any -aligned- file in distDir generated just now
                const files = fs.readdirSync(distDir);
                const alignedFile = files.find(f => f.includes('-aligned-') && f.endsWith('.apk'));
                if (alignedFile) {
                    foundSignedPath = path.join(distDir, alignedFile);
                }
            }

            if (foundSignedPath) {
                if (fs.existsSync(finalApkPath)) {
                    fs.unlinkSync(finalApkPath);
                }
                fs.renameSync(foundSignedPath, finalApkPath);
                
                // Cleanup .idsig files generated by apksigner v4
                const idsigPath = foundSignedPath + '.idsig';
                if (fs.existsSync(idsigPath)) fs.unlinkSync(idsigPath);
            } else {
                throw new Error(`Could not locate the signed APK after signing completed. Signing may have silently failed.`);
            }

            // Step 3: Verify the Signature
            publishBuildEvent('INFO', `Verifying signature of ${signedName}...`);
            await new Promise<void>((resolve, reject) => {
                const verifyArgs = ['-jar', signerPath, '-a', finalApkPath, '-y', '--verbose'];
                const child = spawn(javaPath, verifyArgs, { cwd: options.workspacePath });

                let output = '';
                child.stdout.on('data', (data) => {
                    output += data.toString();
                });
                child.stderr.on('data', (data) => {
                    output += data.toString();
                });

                child.on('close', (code) => {
                    if (code === 0) {
                        publishBuildEvent('SUCCESS', `APK Signature verification: SUCCESS`);
                        resolve();
                    } else {
                        publishBuildEvent('ERROR', `APK Signature verification failed.\n${output}`);
                        reject(new Error(`Signature verification failed with code ${code}`));
                    }
                });

                child.on('error', reject);
            });

            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            const timeStr = `${Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`;
            
            publishBuildEvent('SUCCESS', `Build Complete.\n\nSigned APK generated:\ndist/${signedName}\n\nBuild time: ${timeStr}`);
            
            return finalApkPath;

        } catch (err: any) {
            publishBuildEvent('ERROR', `BUILD FAILED: ${err.message}`);
            throw err;
        }
    }
}

export const buildManager = new BuildManager();
