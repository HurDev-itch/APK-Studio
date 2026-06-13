import * as fs from 'fs/promises';
import * as path from 'path';
import { dialog, BrowserWindow } from 'electron';
import { simpleGit } from 'simple-git';
import type { SimpleGit } from 'simple-git';
import { commandBus } from '../core/commandBus';
import { dbService } from '../core/database';
import { fileSystemService } from './fileSystemService';
import { v4 as uuidv4 } from 'uuid';

export class WorkspaceManager {
    private activeWorkspace: any = null;

    constructor() {
        this.registerCommands();
    }

    public getActiveWorkspace() {
        return this.activeWorkspace;
    }

    private registerCommands() {
        commandBus.register('workspace.create', async ({ targetDir, projectName, initGit }: { targetDir: string, projectName: string, initGit: boolean }) => {
            return this.createWorkspace(targetDir, projectName, initGit);
        });

        commandBus.register('workspace.open', async (workspaceId: string) => {
            return this.openWorkspace(workspaceId);
        });

        commandBus.register('workspace.openByPath', async (workspacePath: string) => {
            return this.openWorkspaceByPath(workspacePath);
        });

        commandBus.register('workspace.getRecent', async () => {
            return this.getRecentWorkspaces();
        });

        commandBus.register('workspace.selectDirectory', async () => {
            const win = BrowserWindow.getFocusedWindow();
            const result = await dialog.showOpenDialog(win!, {
                properties: ['openDirectory', 'createDirectory'],
                title: 'Select output folder for decompiled APK'
            });
            if (!result.canceled && result.filePaths.length > 0) {
                return result.filePaths[0];
            }
            return null;
        });

        // Native APK file picker — works in sandboxed Electron (no file.path needed)
        commandBus.register('apk.openDialog', async () => {
            const win = BrowserWindow.getFocusedWindow();
            const result = await dialog.showOpenDialog(win!, {
                filters: [{ name: 'Android Packages', extensions: ['apk'] }],
                properties: ['openFile'],
                title: 'Select APK to decompile'
            });
            if (!result.canceled && result.filePaths.length > 0) {
                return result.filePaths[0];
            }
            return null;
        });

        commandBus.register('workspace.saveState', async (stateData: any) => {
            if (!this.activeWorkspace) return false;
            const db = dbService.getDb();
            const { openedTabs, activeTab, treeExpansion, bottomPanelHeight, bottomPanelTab } = stateData;
            
            db.prepare(`
                INSERT INTO workspace_state (workspace_id, opened_tabs, active_tab, tree_expansion, bottom_panel_height, bottom_panel_tab)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(workspace_id) DO UPDATE SET
                    opened_tabs = excluded.opened_tabs,
                    active_tab = excluded.active_tab,
                    tree_expansion = excluded.tree_expansion,
                    bottom_panel_height = excluded.bottom_panel_height,
                    bottom_panel_tab = excluded.bottom_panel_tab
            `).run(
                this.activeWorkspace.id,
                JSON.stringify(openedTabs || []),
                activeTab || null,
                JSON.stringify(treeExpansion || []),
                bottomPanelHeight || 200,
                bottomPanelTab || 'Terminal'
            );
            return true;
        });
    }

    private async createWorkspace(targetDir: string, projectName: string, initGit: boolean) {
        const asprojPath = path.join(targetDir, '.asproj');
        const workspaceId = uuidv4();

        const metadata = {
            id: workspaceId,
            name: projectName,
            path: targetDir,
            createdAt: new Date().toISOString(),
        };

        await fs.mkdir(asprojPath, { recursive: true });
        await fs.writeFile(path.join(asprojPath, 'project.json'), JSON.stringify(metadata, null, 2), 'utf-8');

        // Optional Git Init
        if (initGit) {
            const git: SimpleGit = simpleGit(targetDir);
            await git.init();
            await git.add('.');
            await git.commit('Initial commit by APK Studio');
        }

        // Store in Recent Workspaces (SQLite)
        const db = dbService.getDb();
        db.prepare('INSERT OR REPLACE INTO recent_workspaces (id, name, path) VALUES (?, ?, ?)').run(workspaceId, projectName, targetDir);

        return this.openWorkspace(workspaceId);
    }

    private async openWorkspace(workspaceId: string) {
        const db = dbService.getDb();
        const workspace = db.prepare('SELECT * FROM recent_workspaces WHERE id = ?').get(workspaceId) as any;

        if (!workspace) throw new Error('Workspace not found in history');

        db.prepare('UPDATE recent_workspaces SET last_opened = CURRENT_TIMESTAMP WHERE id = ?').run(workspaceId);

        this.activeWorkspace = workspace;
        fileSystemService.watchWorkspace(workspace.path);

        // Load State from SQLite
        const state = db.prepare('SELECT * FROM workspace_state WHERE workspace_id = ?').get(workspaceId);

        return {
            metadata: workspace,
            state: state || { opened_tabs: '[]', active_tab: null, tree_expansion: '[]', bottom_panel_height: 200, bottom_panel_tab: 'Terminal' }
        };
    }

    private async openWorkspaceByPath(workspacePath: string) {
        const db = dbService.getDb();
        // Check if already in recent
        let workspace = db.prepare('SELECT * FROM recent_workspaces WHERE path = ?').get(workspacePath) as any;
        
        if (workspace) {
            return this.openWorkspace(workspace.id);
        }

        // Check if there's a .asproj/project.json
        const projectJsonPath = path.join(workspacePath, '.asproj', 'project.json');
        try {
            const content = await fs.readFile(projectJsonPath, 'utf-8');
            const meta = JSON.parse(content);
            // Re-register in recent
            db.prepare('INSERT OR REPLACE INTO recent_workspaces (id, name, path) VALUES (?, ?, ?)').run(meta.id, meta.name, workspacePath);
            return this.openWorkspace(meta.id);
        } catch {
            // No project.json, create new workspace entry
            const dirName = path.basename(workspacePath);
            return this.createWorkspace(workspacePath, dirName, false);
        }
    }

    private getRecentWorkspaces() {
        const db = dbService.getDb();
        return db.prepare('SELECT * FROM recent_workspaces ORDER BY last_opened DESC').all();
    }
}

export const workspaceManager = new WorkspaceManager();
