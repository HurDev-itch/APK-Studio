import * as fs from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { commandBus } from '../core/commandBus';
import type { PluginManifest } from './PluginSDK';

export class PluginManager {
    private pluginsDir: string | null = null;
    private availablePlugins: Record<string, PluginManifest> = {};
    private enabledPlugins: Record<string, boolean> = {}; // In a real app, persist this to SQLite
    private workers: Record<string, Worker> = {};

    initialize(workspaceRoot: string) {
        this.pluginsDir = path.join(workspaceRoot, '.plugins');
        if (!fs.existsSync(this.pluginsDir)) {
            fs.mkdirSync(this.pluginsDir, { recursive: true });
        }
        this.scanPlugins();
    }

    scanPlugins() {
        if (!this.pluginsDir) return;
        this.availablePlugins = {};

        const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const manifestPath = path.join(this.pluginsDir, entry.name, 'plugin.json');
                if (fs.existsSync(manifestPath)) {
                    try {
                        const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                        this.availablePlugins[manifest.id] = manifest;
                    } catch (e) {
                        console.error(`Failed to load plugin manifest at ${manifestPath}`, e);
                    }
                }
            }
        }
    }

    getPlugins() {
        return Object.values(this.availablePlugins).map(manifest => ({
            ...manifest,
            enabled: !!this.enabledPlugins[manifest.id]
        }));
    }

    enablePlugin(id: string) {
        const manifest = this.availablePlugins[id];
        if (!manifest) throw new Error(`Plugin ${id} not found`);

        this.enabledPlugins[id] = true;

        // Launch Background Worker if specified
        if (manifest.main) {
            const mainPath = path.join(this.pluginsDir!, id, manifest.main);
            if (fs.existsSync(mainPath)) {
                try {
                    const worker = new Worker(mainPath);
                    this.workers[id] = worker;
                    
                    // Setup basic message passing bridging between Worker and SDK
                    worker.on('message', (msg) => {
                        console.log(`[Plugin:${id}]`, msg);
                    });
                    worker.on('error', (err) => {
                        console.error(`[Plugin:${id}] Error:`, err);
                    });
                } catch (e) {
                    console.error(`Failed to launch plugin worker ${id}`, e);
                }
            }
        }
        
        return { success: true };
    }

    disablePlugin(id: string) {
        this.enabledPlugins[id] = false;
        if (this.workers[id]) {
            this.workers[id].terminate();
            delete this.workers[id];
        }
        return { success: true };
    }

    registerIPC() {
        commandBus.register('plugins.init', async (workspaceRoot: string) => {
            this.initialize(workspaceRoot);
            return { success: true };
        });

        commandBus.register('plugins.list', async () => {
            this.scanPlugins();
            return { success: true, data: this.getPlugins() };
        });

        // The frontend triggers this after the user confirms the permissions gateway
        commandBus.register('plugins.enable', async (id: string) => {
            try {
                return this.enablePlugin(id);
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        });

        commandBus.register('plugins.disable', async (id: string) => {
            try {
                return this.disablePlugin(id);
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        });
    }
}

export const pluginManager = new PluginManager();
