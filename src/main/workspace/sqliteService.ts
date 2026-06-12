import { commandBus } from '../core/commandBus';
import Database from 'better-sqlite3';

// Cache database connections
const dbCache: Record<string, Database.Database> = {};

const getDb = (dbPath: string): Database.Database => {
    if (!dbCache[dbPath]) {
        dbCache[dbPath] = new Database(dbPath, { readonly: true });
    }
    return dbCache[dbPath];
};

commandBus.register('sqlite.getTables', async (dbPath: string) => {
    try {
        const db = getDb(dbPath);
        const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
        const tables = stmt.all();
        return { success: true, data: tables.map((t: any) => t.name) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});

commandBus.register('sqlite.query', async (args: { dbPath: string, sql: string }) => {
    try {
        const db = getDb(args.dbPath);
        const stmt = db.prepare(args.sql);
        
        // Use all() for SELECT queries
        if (args.sql.trim().toUpperCase().startsWith('SELECT') || args.sql.trim().toUpperCase().startsWith('PRAGMA')) {
            const rows = stmt.all();
            return { success: true, data: rows };
        } else {
            // Not allowing mutations from frontend for safety in this version
            return { success: false, error: 'Only SELECT queries are supported in this viewer.' };
        }
    } catch (e: any) {
        return { success: false, error: e.message };
    }
});
