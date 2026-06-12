import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileCode, FolderOpen, Plus, File, Settings, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

export const WelcomeScreen: React.FC = () => {
    const { t } = useTranslation('common');
    const { setWorkspaceRoot, setBottomPanelState } = useWorkspaceStore();
    const [toolchainStatus, setToolchainStatus] = useState<any>(null);
    const [downloading, setDownloading] = useState(false);
    const [decompiling, setDecompiling] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [recentWorkspaces, setRecentWorkspaces] = useState<any[]>([]);

    useEffect(() => {
        checkToolchains();
        loadRecentWorkspaces();
    }, []);

    const loadRecentWorkspaces = async () => {
        const res = await window.electronAPI.executeCommand('workspace.getRecent');
        if (res.success && Array.isArray(res.data)) {
            setRecentWorkspaces(res.data);
        }
    };

    const checkToolchains = async () => {
        const status = await window.electronAPI.executeCommand('toolchain.checkStatus');
        if (status.success) {
            setToolchainStatus(status.data);
        }
    };

    const downloadToolchains = async () => {
        setDownloading(true);
        setBottomPanelState(true, 'terminal');
        await window.electronAPI.executeCommand('toolchain.downloadAll');
        await checkToolchains();
        setDownloading(false);
    };

    const handleOpenApk = async () => {
        if (decompiling) return;

        // Use native Electron file dialog — works with contextIsolation
        const apkRes = await window.electronAPI.executeCommand('apk.openDialog');
        if (!apkRes.success || !apkRes.data) return;
        const apkPath: string = apkRes.data;

        // Ask for output directory
        const outDirRes = await window.electronAPI.executeCommand('workspace.selectDirectory');
        if (!outDirRes.success || !outDirRes.data) return;
        const outputDir: string = outDirRes.data;

        setDecompiling(true);
        setBottomPanelState(true, 'terminal');

        try {
            const res = await window.electronAPI.executeCommand('apktool.decompile', {
                apkPath,
                outputDir
            });

            if (res.success) {
                // Extract project name from APK filename
                const apkFileName = apkPath.split(/[\\/]/).pop() || 'project';
                const projectName = apkFileName.replace(/\.apk$/i, '');

                const createRes = await window.electronAPI.executeCommand('workspace.create', {
                    targetDir: outputDir,
                    projectName,
                    initGit: false
                });

                if (createRes.success && createRes.data?.metadata) {
                    // Set workspace root so the IDE switches from WelcomeScreen to editor
                    setWorkspaceRoot(createRes.data.metadata.path);
                }
            }
        } catch (err) {
            console.error('Decompilation failed', err);
        }

        setDecompiling(false);
    };

    const handleOpenWorkspaceFolder = async () => {
        const res = await window.electronAPI.executeCommand('workspace.selectDirectory');
        if (!res.success || !res.data) return;

        const openRes = await window.electronAPI.executeCommand('workspace.openByPath', res.data);
        if (openRes.success && openRes.data?.metadata) {
            setWorkspaceRoot(openRes.data.metadata.path);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        if (decompiling || isMissingTools) return;

        // In Electron with contextIsolation, files from drag events may still have .path
        // but we handle it gracefully
        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        const filePath = (file as any).path;
        if (!filePath || !filePath.toLowerCase().endsWith('.apk')) return;

        // Ask for output directory
        const outDirRes = await window.electronAPI.executeCommand('workspace.selectDirectory');
        if (!outDirRes.success || !outDirRes.data) return;
        const outputDir: string = outDirRes.data;

        setDecompiling(true);
        setBottomPanelState(true, 'terminal');

        try {
            const res = await window.electronAPI.executeCommand('apktool.decompile', {
                apkPath: filePath,
                outputDir
            });

            if (res.success) {
                const apkFileName = filePath.split(/[\\/]/).pop() || 'project';
                const projectName = apkFileName.replace(/\.apk$/i, '');

                const createRes = await window.electronAPI.executeCommand('workspace.create', {
                    targetDir: outputDir,
                    projectName,
                    initGit: false
                });

                if (createRes.success && createRes.data?.metadata) {
                    setWorkspaceRoot(createRes.data.metadata.path);
                }
            }
        } catch (err) {
            console.error('Decompilation failed', err);
        }

        setDecompiling(false);
    };

    const openWorkspace = async (ws: any) => {
        const res = await window.electronAPI.executeCommand('workspace.open', ws.id);
        if (res.success && res.data?.metadata) {
            setWorkspaceRoot(res.data.metadata.path);
        }
    };

    const isMissingTools = toolchainStatus && (!toolchainStatus.java || !toolchainStatus.apktool || !toolchainStatus.signer || !toolchainStatus.adb);

    return (
        <div 
            className={`relative h-full flex flex-col items-center justify-center bg-ide-bg text-ide-text select-none overflow-y-auto p-8 transition-colors ${isDragging ? 'bg-[#252526]' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="absolute inset-0 z-50 border-4 border-dashed border-ide-accent bg-ide-bg/80 flex items-center justify-center pointer-events-none">
                    <div className="text-2xl font-semibold text-ide-text-bright flex items-center gap-4">
                        <FileCode size={32} className="text-ide-accent" />
                        Drop APK to Decompile
                    </div>
                </div>
            )}

            <div className="max-w-4xl w-full flex flex-col gap-8">
                
                {isMissingTools && (
                    <div className="bg-ide-panel border border-[#cd3131] rounded-lg p-4 flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-4">
                            <AlertTriangle className="text-[#cd3131]" size={24} />
                            <div>
                                <h3 className="text-white font-semibold">Missing Required Dependencies</h3>
                                <p className="text-sm text-ide-text-muted mt-1">APK Studio requires Java 17, APKTool, Uber-APK-Signer, and ADB to function.</p>
                            </div>
                        </div>
                        <button 
                            onClick={downloadToolchains}
                            disabled={downloading}
                            className="bg-ide-accent text-white px-4 py-2 rounded shadow hover:bg-ide-accent/90 disabled:opacity-50 flex items-center gap-2 shrink-0"
                        >
                            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            {downloading ? 'Downloading...' : 'Download & Install All'}
                        </button>
                    </div>
                )}

                <div className="flex gap-16">
                    {/* Left Column: Actions & Logo */}
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-16 h-16 bg-[#252526] rounded-2xl flex items-center justify-center border border-[#3e3e42] shadow-lg">
                                <svg className="w-10 h-10 text-ide-accent" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.523 15.3414C17.523 15.3414 16.0336 17.5543 12.0153 17.5543C7.99696 17.5543 6.4673 15.3414 6.4673 15.3414L3.89668 19.8665C3.89668 19.8665 6.40263 21.9961 12.0153 21.9961C17.628 21.9961 20.0936 19.8665 20.0936 19.8665L17.523 15.3414ZM11.9669 2.00391C6.26257 2.00391 3.86438 4.25433 3.86438 4.25433L6.50566 8.71802C6.50566 8.71802 8.02677 6.44498 11.9669 6.44498C15.907 6.44498 17.5233 8.71802 17.5233 8.71802L20.103 4.25433C20.103 4.25433 17.6713 2.00391 11.9669 2.00391ZM21.9961 11.9999C21.9961 6.47167 19.9213 4.02083 19.9213 4.02083L15.3959 6.59128C15.3959 6.59128 17.6083 8.12061 17.6083 11.9999C17.6083 15.8791 15.3959 17.4084 15.3959 17.4084L19.9213 19.9789C19.9213 19.9789 21.9961 17.5281 21.9961 11.9999ZM2.00391 11.9999C2.00391 17.4913 4.10444 19.9537 4.10444 19.9537L8.60172 17.3789C8.60172 17.3789 6.38883 15.8569 6.38883 11.9999C6.38883 8.14291 8.60172 6.62088 8.60172 6.62088L4.10444 4.04614C4.10444 4.04614 2.00391 6.50854 2.00391 11.9999Z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-light text-white tracking-wide">{t('app.title')}</h1>
                                <p className="text-sm text-ide-text-muted mt-1">Professional Android Reverse Engineering</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h2 className="text-sm font-semibold text-white mb-3">Start</h2>
                                <ul className="space-y-1">
                                    <li>
                                        <button 
                                            onClick={handleOpenApk}
                                            disabled={decompiling || !!isMissingTools}
                                            className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-ide-accent hover:bg-[#2a2d2e] transition-colors disabled:opacity-50"
                                        >
                                            {decompiling ? <Loader2 size={18} className="animate-spin" /> : <FileCode size={18} />}
                                            <span>{decompiling ? 'Decompiling APK...' : 'Open APK...'}</span>
                                        </button>
                                    </li>
                                    <li>
                                        <button 
                                            onClick={handleOpenWorkspaceFolder}
                                            className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-ide-accent hover:bg-[#2a2d2e] transition-colors"
                                        >
                                            <FolderOpen size={18} />
                                            <span>Open Workspace...</span>
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Recent & Learn */}
                    <div className="flex-1 border-l border-ide-border pl-16">
                        <div className="mb-8">
                            <h2 className="text-sm font-semibold text-white mb-3">Recent</h2>
                            <ul className="space-y-1">
                                {recentWorkspaces.length === 0 ? (
                                    <li className="text-sm text-ide-text-muted px-3 py-2">No recent projects</li>
                                ) : (
                                    recentWorkspaces.slice(0, 5).map(ws => (
                                        <li key={ws.id}>
                                            <button 
                                                onClick={() => openWorkspace(ws)}
                                                className="flex flex-col items-start w-full text-left px-3 py-2 rounded-md hover:bg-[#2a2d2e] transition-colors group"
                                            >
                                                <span className="text-ide-text-bright group-hover:text-white">{ws.name}</span>
                                                <span className="text-xs text-ide-text-muted font-mono truncate w-full" title={ws.path}>{ws.path}</span>
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>

                        <div>
                            <h2 className="text-sm font-semibold text-white mb-3">Learn</h2>
                            <ul className="space-y-1">
                                <li>
                                    <button className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-ide-text hover:bg-[#2a2d2e] transition-colors">
                                        <Settings size={16} className="text-ide-text-muted" />
                                        <span>Customize Theme</span>
                                    </button>
                                </li>
                                <li>
                                    <button className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-ide-text hover:bg-[#2a2d2e] transition-colors">
                                        <File size={16} className="text-ide-text-muted" />
                                        <span>Interactive Playground</span>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
