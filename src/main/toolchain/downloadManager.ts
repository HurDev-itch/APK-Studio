import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import AdmZip from 'adm-zip';
import { eventBus } from '../core/eventBus';

export interface DownloadOptions {
    url: string;
    destFile: string;
    sha256?: string;
    extractTo?: string; // If provided, extracts zip and deletes original
    onProgress?: (percent: number, transferred: number, total: number) => void;
    retries?: number;
}

export class DownloadManager {
    static async download(options: DownloadOptions): Promise<boolean> {
        const retries = options.retries || 3;
        
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await this.performDownload(options);
                
                // Verify SHA256 if provided
                if (options.sha256) {
                    const isValid = await this.verifySha256(options.destFile, options.sha256);
                    if (!isValid) {
                        throw new Error(`SHA256 mismatch for ${options.destFile}`);
                    }
                }

                // Extract if needed
                if (options.extractTo) {
                    eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `Extracting ${path.basename(options.destFile)}...\r\n` });
                    const zip = new AdmZip(options.destFile);
                    zip.extractAllTo(options.extractTo, true);
                    fs.unlinkSync(options.destFile);
                }

                return true;
            } catch (e: any) {
                if (attempt === retries) {
                    eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[31mDownload failed after ${retries} attempts: ${e.message}\x1b[0m\r\n` });
                    throw e;
                }
                eventBus.publish({ type: 'TERMINAL_OUTPUT', payload: `\x1b[33mDownload failed (attempt ${attempt}), retrying...\x1b[0m\r\n` });
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        return false;
    }

    private static performDownload(options: DownloadOptions): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await axios({
                    url: options.url,
                    method: 'GET',
                    responseType: 'stream',
                    timeout: 30000,
                });

                const totalLength = parseInt(response.headers['content-length'] || '0', 10);
                let downloaded = 0;

                const writer = fs.createWriteStream(options.destFile);
                
                response.data.on('data', (chunk: Buffer) => {
                    downloaded += chunk.length;
                    if (options.onProgress && totalLength > 0) {
                        const percent = Math.round((downloaded / totalLength) * 100);
                        options.onProgress(percent, downloaded, totalLength);
                    }
                });

                response.data.pipe(writer);

                writer.on('finish', () => resolve());
                writer.on('error', reject);
            } catch (e) {
                reject(e);
            }
        });
    }

    private static verifySha256(filePath: string, expectedHash: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            
            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('end', () => {
                const actualHash = hash.digest('hex');
                resolve(actualHash.toLowerCase() === expectedHash.toLowerCase());
            });
            stream.on('error', reject);
        });
    }
}
