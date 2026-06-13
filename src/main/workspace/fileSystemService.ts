import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import chokidar from 'chokidar';
import type { FSWatcher } from 'chokidar';
import { commandBus } from '../core/commandBus';
import { eventBus } from '../core/eventBus';
import { shell } from 'electron';

export class FileSystemService {
    private watcher: FSWatcher | null = null;
    private workspaceRoot: string | null = null;

    constructor() {
        this.registerCommands();
    }

    private registerCommands() {
        commandBus.register('fs.readDir', async (dirPath: string) => {
            this.enforceSecurity(dirPath);
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            return entries.map(entry => ({
                name: entry.name,
                path: path.join(dirPath, entry.name),
                isDirectory: entry.isDirectory(),
            }));
        });

        commandBus.register('fs.readFile', async (filePath: string) => {
            this.enforceSecurity(filePath);
            const content = await fs.readFile(filePath, 'utf-8');
            return content;
        });

        commandBus.register('fs.readFileBase64', async (filePath: string) => {
            this.enforceSecurity(filePath);
            const content = await fs.readFile(filePath);
            return content.toString('base64');
        });

        commandBus.register('fs.writeFile', async ({ filePath, content, isAutoSave }: { filePath: string, content: string, isAutoSave?: boolean }) => {
            this.enforceSecurity(filePath);
            
            if (isAutoSave) {
                await this.createSnapshot(filePath);
            }
            
            await fs.writeFile(filePath, content, 'utf-8');
            return true;
        });

        commandBus.register('fs.createFile', async ({ parentDir, name, content }: { parentDir: string, name: string, content: string }) => {
            const targetPath = path.join(parentDir, name);
            await fs.writeFile(targetPath, content, 'utf-8');
            return true;
        });

        commandBus.register('fs.createDirectory', async (dirPath: string) => {
            this.enforceSecurity(dirPath);
            await fs.mkdir(dirPath, { recursive: true });
            return true;
        });

        commandBus.register('fs.rename', async ({ oldPath, newPath }: { oldPath: string, newPath: string }) => {
            this.enforceSecurity(oldPath);
            this.enforceSecurity(newPath);
            await fs.rename(oldPath, newPath);
            return true;
        });

        commandBus.register('fs.delete', async (targetPath: string) => {
            this.enforceSecurity(targetPath);
            await fs.rm(targetPath, { recursive: true, force: true });
            return true;
        });

        commandBus.register('fs.duplicate', async ({ sourcePath, targetPath }: { sourcePath: string, targetPath: string }) => {
            this.enforceSecurity(sourcePath);
            this.enforceSecurity(targetPath);
            await fs.cp(sourcePath, targetPath, { recursive: true });
            return true;
        });

        commandBus.register('fs.showInExplorer', async (targetPath: string) => {
            // We don't enforce security here because it just opens the native file explorer, but we could
            shell.showItemInFolder(targetPath);
            return true;
        });

        commandBus.register('workspace.search', async ({ workspaceRoot, query }: { workspaceRoot: string, query: string }) => {
            return this.searchWorkspace(workspaceRoot, query);
        });
    }

    private async searchWorkspace(dir: string, query: string): Promise<any[]> {
        const results: any[] = [];
        const regex = new RegExp(query, 'i');

        async function walk(currentDir: string) {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                
                // Skip common ignore dirs
                if (entry.isDirectory()) {
                    if (!['.git', 'node_modules', 'dist', 'build', '.asproj'].includes(entry.name)) {
                        await walk(fullPath);
                    }
                } else {
                    // Skip binary/large files based on extension
                    if (entry.name.match(/\.(png|jpe?g|gif|webp|zip|apk|jar|dex|so|ttf|woff2?|class|db|sqlite)$/i)) continue;

                    try {
                        const fileStream = createReadStream(fullPath, { encoding: 'utf-8' });
                        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
                        
                        let lineNumber = 1;
                        for await (const line of rl) {
                            if (regex.test(line)) {
                                results.push({
                                    file: path.relative(dir, fullPath),
                                    line: lineNumber,
                                    text: line
                                });
                            }
                            lineNumber++;
                        }
                    } catch (e) {
                        // Ignore read errors
                    }
                }
            }
        }

        await walk(dir);
        return results;
    }

    public watchWorkspace(rootPath: string) {
        if (this.watcher) {
            this.watcher.close();
        }
        
        this.workspaceRoot = rootPath;
        
        this.watcher = chokidar.watch(rootPath, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: true
        });

        this.watcher
            .on('add', (filePath: string) => this.notifyChange('add', filePath))
            .on('change', (filePath: string) => this.notifyChange('change', filePath))
            .on('unlink', (filePath: string) => this.notifyChange('unlink', filePath))
            .on('addDir', (dirPath: string) => this.notifyChange('addDir', dirPath))
            .on('unlinkDir', (dirPath: string) => this.notifyChange('unlinkDir', dirPath));
    }

    private notifyChange(event: string, filePath: string) {
        eventBus.publish({
            type: 'FS_EVENT',
            payload: { event, filePath }
        });
    }

    private enforceSecurity(targetPath: string) {
        // Allow access before any workspace is set (e.g., toolchain checks on startup)
        if (!this.workspaceRoot) {
            return;
        }
        const resolvedTarget = path.resolve(targetPath);
        const resolvedRoot = path.resolve(this.workspaceRoot);
        
        if (!resolvedTarget.startsWith(resolvedRoot)) {
            throw new Error('Security Error: Path is outside workspace root');
        }
    }

    private async createSnapshot(filePath: string) {
        try {
            const originalContent = await fs.readFile(filePath, 'utf-8');
            const snapshotDir = path.join(this.workspaceRoot!, '.asproj', 'snapshots');
            await fs.mkdir(snapshotDir, { recursive: true });
            
            const timestamp = Date.now();
            const relativePath = path.relative(this.workspaceRoot!, filePath).replace(/[\/\\]/g, '_');
            const snapshotPath = path.join(snapshotDir, `${relativePath}.${timestamp}.snapshot`);
            
            await fs.writeFile(snapshotPath, originalContent, 'utf-8');
        } catch (e) {
            // File might not exist yet, ignore
        }
    }
}

export const fileSystemService = new FileSystemService();
