import { parentPort, workerData } from 'worker_threads';
import * as fs from 'fs/promises';
import * as path from 'path';

interface IndexerData {
    workspacePath: string;
}

const { workspacePath } = workerData as IndexerData;

async function walkDir(dir: string, fileList: string[] = []) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    
    for (const file of files) {
        if (file.name === '.git' || file.name === '.asproj' || file.name === 'build') continue;
        
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            await walkDir(filePath, fileList);
        } else {
            fileList.push(filePath);
        }
    }
    return fileList;
}

async function runIndexer() {
    parentPort?.postMessage({ status: 'indexing_started' });
    
    try {
        const allFiles = await walkDir(workspacePath);
        // In the future, we will parse file contents to build a reverse-index (TF-IDF or similar)
        // For Phase 3, we simply map file paths to prove the worker architecture works
        
        parentPort?.postMessage({ status: 'indexing_complete', indexedFilesCount: allFiles.length });
    } catch (e: any) {
        parentPort?.postMessage({ status: 'error', message: e.message });
    }
}

runIndexer();
