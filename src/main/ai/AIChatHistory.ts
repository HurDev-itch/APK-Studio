import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export class AIChatHistory {
    private db: Database.Database | null = null;
    initialize(workspaceRoot: string) {
        const aiDir = path.join(workspaceRoot, '.ai');
        
        if (!fs.existsSync(aiDir)) {
            fs.mkdirSync(aiDir, { recursive: true });
        }

        const dbPath = path.join(aiDir, 'history.db');
        this.db = new Database(dbPath);
        
        // Initialize schema
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                provider TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    addMessage(role: string, content: string, provider?: string) {
        if (!this.db) return;
        const stmt = this.db.prepare('INSERT INTO chat_history (role, content, provider) VALUES (?, ?, ?)');
        stmt.run(role, content, provider || null);
    }

    getHistory(limit: number = 50): any[] {
        if (!this.db) return [];
        const stmt = this.db.prepare('SELECT * FROM chat_history ORDER BY timestamp ASC LIMIT ?');
        return stmt.all(limit);
    }

    clearHistory() {
        if (!this.db) return;
        this.db.exec('DELETE FROM chat_history');
    }
}

export const chatHistory = new AIChatHistory();
