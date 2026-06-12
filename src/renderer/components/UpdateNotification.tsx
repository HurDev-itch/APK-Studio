import React, { useState, useEffect } from 'react';
import { DownloadCloud, RefreshCw, X } from 'lucide-react';
import type { IEvent } from '../../shared/bus/types';

interface UpdateState {
    status: 'idle' | 'available' | 'downloading' | 'downloaded' | 'error';
    version?: string;
    progress?: number;
    errorMsg?: string;
}

export const UpdateNotification: React.FC = () => {
    const [state, setState] = useState<UpdateState>({ status: 'idle' });
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const unsubscribe = window.electronAPI.onEvent((event: IEvent) => {
            switch (event.type) {
                case 'update-available':
                    setState({ status: 'available', version: event.payload?.version });
                    setVisible(true);
                    break;
                case 'download-progress':
                    setState(s => ({ ...s, status: 'downloading', progress: event.payload?.percent || 0 }));
                    setVisible(true);
                    break;
                case 'update-downloaded':
                    setState(s => ({ ...s, status: 'downloaded' }));
                    setVisible(true);
                    break;
                case 'update-error':
                    setState(s => ({ ...s, status: 'error', errorMsg: event.payload }));
                    setVisible(true);
                    break;
            }
        });

        return () => unsubscribe();
    }, []);

    if (!visible || state.status === 'idle') return null;

    const downloadUpdate = async () => {
        setState(s => ({ ...s, status: 'downloading', progress: 0 }));
        await window.electronAPI.executeCommand('updater.downloadUpdate');
    };

    const installUpdate = async () => {
        await window.electronAPI.executeCommand('updater.installUpdate');
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-[#1e1e1e] border border-ide-border rounded shadow-lg p-4 w-[320px]">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-medium text-white flex items-center gap-2">
                        {state.status === 'available' && <DownloadCloud size={16} className="text-blue-400" />}
                        {state.status === 'downloading' && <RefreshCw size={16} className="text-blue-400 animate-spin" />}
                        {state.status === 'downloaded' && <DownloadCloud size={16} className="text-green-400" />}
                        {state.status === 'error' && <X size={16} className="text-red-400" />}
                        
                        {state.status === 'available' && `Update ${state.version || ''} Available`}
                        {state.status === 'downloading' && 'Downloading Update...'}
                        {state.status === 'downloaded' && 'Update Ready'}
                        {state.status === 'error' && 'Update Failed'}
                    </h3>
                    <button onClick={() => setVisible(false)} className="text-ide-text-muted hover:text-white transition-colors">
                        <X size={14} />
                    </button>
                </div>

                {state.status === 'downloading' && (
                    <div className="mt-3">
                        <div className="h-1.5 w-full bg-[#2d2d2d] rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${state.progress}%` }}
                            />
                        </div>
                        <div className="text-xs text-ide-text-muted mt-1 text-right">{Math.round(state.progress || 0)}%</div>
                    </div>
                )}

                {state.status === 'error' && (
                    <div className="text-xs text-red-400 mt-2 line-clamp-2">
                        {state.errorMsg}
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-4 text-xs">
                    <button 
                        className="px-3 py-1.5 rounded hover:bg-[#2d2d2d] text-ide-text-muted hover:text-white transition-colors"
                        onClick={() => setVisible(false)}
                    >
                        Later
                    </button>
                    {state.status === 'available' && (
                        <button 
                            className="px-3 py-1.5 rounded bg-ide-accent text-white hover:bg-opacity-90 transition-colors"
                            onClick={downloadUpdate}
                        >
                            Download
                        </button>
                    )}
                    {state.status === 'downloaded' && (
                        <button 
                            className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-500 transition-colors"
                            onClick={installUpdate}
                        >
                            Restart Now
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
