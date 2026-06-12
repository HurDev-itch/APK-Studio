import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export class EnvManager {
    public isPortable: boolean = false;
    public appDataPath: string;

    constructor() {
        // Detect portable mode
        // process.env.PORTABLE_EXECUTABLE_DIR is set by electron-builder's portable target
        const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
        const exeDir = path.dirname(app.getPath('exe'));
        
        // Also check if a .portable file exists next to the executable (useful for manual portable mode)
        const portableFileExists = fs.existsSync(path.join(exeDir, '.portable'));

        if (portableDir) {
            this.isPortable = true;
            this.appDataPath = path.join(portableDir, 'APK Studio Portable');
        } else if (portableFileExists) {
            this.isPortable = true;
            this.appDataPath = path.join(exeDir, 'APK Studio Portable');
        } else {
            this.isPortable = false;
            this.appDataPath = app.getPath('userData');
        }

        // Apply custom app data path if portable
        if (this.isPortable) {
            if (!fs.existsSync(this.appDataPath)) {
                fs.mkdirSync(this.appDataPath, { recursive: true });
            }
            app.setPath('userData', this.appDataPath);
            app.setPath('appData', this.appDataPath);
        }
    }
}

// Instantiate immediately to override app paths before other modules initialize
export const envManager = new EnvManager();
