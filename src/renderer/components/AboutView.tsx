import React, { useState, useEffect } from 'react';
import { Info, DownloadCloud, Blocks } from 'lucide-react';
import type { IEvent } from '../../shared/bus/types';

export const AboutView: React.FC = () => {
    const [status, setStatus] = useState<string>('');
    
    // Hardcoded for this mockup, normally retrieved from process.versions
    const versions = {
        app: '1.0.0',
        electron: '33.2.0',
        node: '24.16.0',
        chromium: '130.0.6723.44',
        channel: 'Stable'
    };

    useEffect(() => {
        const unsubscribe = window.electronAPI.onEvent((event: IEvent) => {
            switch (event.type) {
                case 'update-available':
                    setStatus(`Update ${event.payload?.version || ''} available`);
                    break;
                case 'update-not-available':
                    setStatus('You are on the latest version.');
                    break;
                case 'download-progress':
                    setStatus(`Downloading... ${Math.round(event.payload?.percent || 0)}%`);
                    break;
                case 'update-downloaded':
                    setStatus('Update ready to install. Restart to apply.');
                    break;
                case 'update-error':
                    setStatus('Error checking for updates.');
                    break;
            }
        });
        return () => unsubscribe();
    }, []);

    const checkForUpdates = () => {
        setStatus('Checking for updates...');
        window.electronAPI.executeCommand('updater.checkForUpdates');
    };

    return (
        <div className="h-full bg-ide-bg text-ide-text p-8 overflow-y-auto relative flex justify-center">
            <div className="max-w-2xl w-full space-y-8">
                
                {/* Header */}
                <div className="flex items-center gap-6 border-b border-ide-border pb-6">
                    <div className="w-24 h-24 bg-ide-panel border border-ide-border rounded-xl flex items-center justify-center shadow-lg">
                        <Blocks size={48} className="text-ide-accent" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-light text-white tracking-wide">APK Studio</h1>
                        <p className="text-ide-text-muted mt-1 text-sm">Version {versions.app} ({versions.channel})</p>
                    </div>
                </div>

                {/* Update Section */}
                <div className="bg-[#1e1e1e] border border-ide-border rounded-lg p-5">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-white font-medium mb-1">Updates</h3>
                            <p className="text-sm text-ide-text-muted">{status || 'Check if there are newer versions available.'}</p>
                        </div>
                        <button 
                            className="px-4 py-2 bg-ide-accent text-white rounded hover:bg-opacity-90 transition-colors flex items-center gap-2 text-sm"
                            onClick={checkForUpdates}
                        >
                            <DownloadCloud size={16} />
                            Check for Updates
                        </button>
                    </div>
                </div>

                {/* System Info */}
                <div>
                    <h3 className="text-sm font-medium text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Info size={16} className="text-ide-text-muted" />
                        System Information
                    </h3>
                    <div className="bg-[#1e1e1e] border border-ide-border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <tbody>
                                <tr className="border-b border-ide-border">
                                    <th className="px-4 py-3 font-normal text-ide-text-muted bg-[#252526] w-1/3">Electron</th>
                                    <td className="px-4 py-3 font-mono text-ide-text-bright">{versions.electron}</td>
                                </tr>
                                <tr className="border-b border-ide-border">
                                    <th className="px-4 py-3 font-normal text-ide-text-muted bg-[#252526]">Node.js</th>
                                    <td className="px-4 py-3 font-mono text-ide-text-bright">{versions.node}</td>
                                </tr>
                                <tr className="border-b border-ide-border">
                                    <th className="px-4 py-3 font-normal text-ide-text-muted bg-[#252526]">Chromium</th>
                                    <td className="px-4 py-3 font-mono text-ide-text-bright">{versions.chromium}</td>
                                </tr>
                                <tr>
                                    <th className="px-4 py-3 font-normal text-ide-text-muted bg-[#252526]">OS</th>
                                    <td className="px-4 py-3 font-mono text-ide-text-bright capitalize">{navigator.platform}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* License */}
                <div className="text-xs text-ide-text-muted text-center pt-8">
                    <p>APK Studio is open source software.</p>
                    <p className="mt-1">Copyright © 2026 The APK Studio Team.</p>
                </div>
            </div>
        </div>
    );
};
