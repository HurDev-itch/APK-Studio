import { parentPort, workerData } from 'worker_threads';
import { exec } from 'child_process';

export interface UnpackTaskData {
    apkPath: string;
    outputDir: string;
    apkToolPath: string;
}

const { apkPath, outputDir, apkToolPath } = workerData as UnpackTaskData;

const command = `java -jar "${apkToolPath}" d "${apkPath}" -o "${outputDir}" -f`;

// Send initial message
parentPort?.postMessage({ type: 'stdout', data: `Executing: ${command}\r\n` });

const child = exec(command);

child.stdout?.on('data', (data) => {
    // Forward stdout to parent
    parentPort?.postMessage({ type: 'stdout', data: data.toString() });
});

child.stderr?.on('data', (data) => {
    // Forward stderr to parent
    parentPort?.postMessage({ type: 'stderr', data: data.toString() });
});

child.on('close', (code) => {
    parentPort?.postMessage({ type: 'done', code });
});
