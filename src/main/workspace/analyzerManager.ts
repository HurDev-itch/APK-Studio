import * as fs from 'fs/promises';
import * as path from 'path';
import { commandBus } from '../core/commandBus';

export class AnalyzerManager {
    constructor() {
        this.registerCommands();
    }

    private registerCommands() {
        commandBus.register('analyzer.getApkInfo', async (workspaceRoot: string) => {
            return this.getApkInfo(workspaceRoot);
        });
    }

    private async getApkInfo(workspaceRoot: string) {
        const info: any = {
            packageName: 'Unknown',
            versionCode: 'Unknown',
            versionName: 'Unknown',
            minSdk: 'Unknown',
            targetSdk: 'Unknown',
            permissions: []
        };

        try {
            // Read apktool.yml
            const ymlPath = path.join(workspaceRoot, 'apktool.yml');
            const ymlContent = await fs.readFile(ymlPath, 'utf-8');
            
            const lines = ymlContent.split('\n');
            let inSdkInfo = false;
            let inVersionInfo = false;

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed === 'sdkInfo:') inSdkInfo = true;
                else if (trimmed === 'versionInfo:') inVersionInfo = true;
                else if (trimmed && !trimmed.startsWith(' ')) {
                    inSdkInfo = false;
                    inVersionInfo = false;
                }

                if (inSdkInfo) {
                    if (trimmed.startsWith('minSdkVersion:')) info.minSdk = trimmed.split(':')[1].trim().replace(/['"]/g, '');
                    if (trimmed.startsWith('targetSdkVersion:')) info.targetSdk = trimmed.split(':')[1].trim().replace(/['"]/g, '');
                }

                if (inVersionInfo) {
                    if (trimmed.startsWith('versionCode:')) info.versionCode = trimmed.split(':')[1].trim().replace(/['"]/g, '');
                    if (trimmed.startsWith('versionName:')) info.versionName = trimmed.split(':')[1].trim().replace(/['"]/g, '');
                }
            }
        } catch (e) {
            // Ignore if apktool.yml is missing
        }

        try {
            // Read AndroidManifest.xml for package and permissions
            const manifestPath = path.join(workspaceRoot, 'AndroidManifest.xml');
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');

            const packageMatch = manifestContent.match(/package="([^"]+)"/);
            if (packageMatch) {
                info.packageName = packageMatch[1];
            }

            const permissionMatches = [...manifestContent.matchAll(/<uses-permission[^>]+name="([^"]+)"/g)];
            info.permissions = permissionMatches.map(m => m[1]);

        } catch (e) {
            // Ignore
        }

        return info;
    }
}

export const analyzerManager = new AnalyzerManager();
