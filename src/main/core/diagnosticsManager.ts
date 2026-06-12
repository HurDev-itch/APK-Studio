import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { envManager } from './envManager';

class DiagnosticsManager {
    private logsDir: string;
    private crashesDir: string;
    private diagnosticsDir: string;
    private logFile: string;

    constructor() {
        const baseDir = envManager.isPortable 
            ? envManager.appDataPath 
            : path.join(app.getPath('userData'));

        this.logsDir = path.join(baseDir, 'logs');
        this.crashesDir = path.join(baseDir, 'crashes');
        this.diagnosticsDir = path.join(baseDir, 'diagnostics');

        this.ensureDirectories();

        this.logFile = path.join(this.logsDir, `apk-studio-${new Date().toISOString().split('T')[0]}.log`);
        
        // Configure electron crashReporter to save locally
        app.setPath('crashDumps', this.crashesDir);
    }

    private ensureDirectories() {
        [this.logsDir, this.crashesDir, this.diagnosticsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    public log(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: any) {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
        const logLine = `[${timestamp}] [${level}] ${message}${metaStr}\n`;
        
        // Append to file
        fs.appendFileSync(this.logFile, logLine);
    }

    public generateDiagnosticReport(): string {
        const reportPath = path.join(this.diagnosticsDir, `report-${Date.now()}.json`);
        const report = {
            timestamp: new Date().toISOString(),
            appVersion: app.getVersion(),
            electronVersion: process.versions.electron,
            nodeVersion: process.versions.node,
            platform: process.platform,
            arch: process.arch,
            isPortable: envManager.isPortable
        };
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        this.log('INFO', `Diagnostic report generated at ${reportPath}`);
        return reportPath;
    }
}

export const diagnosticsManager = new DiagnosticsManager();
