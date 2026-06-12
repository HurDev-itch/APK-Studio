import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

class DatabaseService {
    private db: Database.Database | null = null;

    constructor() {
        this.init();
    }

    private init() {
        try {
            // Store the database in the app's userData directory
            const dbPath = path.join(app.getPath('userData'), 'apk-studio-core.db');
            
            const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
            const nativeBinding = isDev 
                ? path.join(app.getAppPath(), 'node_modules/better-sqlite3/build/Release/better_sqlite3.node')
                : path.join(process.resourcesPath, 'app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node');

            this.db = new Database(dbPath, { 
                verbose: console.log,
                nativeBinding
            });
            
            // Enable WAL mode for better performance
            this.db.pragma('journal_mode = WAL');
            
            this.initializeTables();
            console.log('Database initialized at:', dbPath);
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    private initializeTables() {
        if (!this.db) return;
        
        // Setup initial schemas for workspaces, plugin states, etc.
        const setupQuery = `
            CREATE TABLE IF NOT EXISTS recent_workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                last_opened DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS workspace_state (
                workspace_id TEXT PRIMARY KEY,
                opened_tabs TEXT,
                active_tab TEXT,
                tree_expansion TEXT,
                FOREIGN KEY(workspace_id) REFERENCES recent_workspaces(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS plugin_state (
                plugin_id TEXT,
                key TEXT,
                value TEXT,
                PRIMARY KEY (plugin_id, key)
            );
        `;
        
        this.db.exec(setupQuery);
    }

    public getDb(): Database.Database {
        if (!this.db) {
            throw new Error("Database not initialized");
        }
        return this.db;
    }

    public close() {
        if (this.db) {
            this.db.close();
        }
    }
}

export const dbService = new DatabaseService();
