import { useState, useEffect } from 'react';
import { CheckCircle2, GitBranch, Bell, DownloadCloud } from 'lucide-react';
import type { IEvent } from '../../shared/bus/types';

export const StatusBar = () => {
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        const unsubscribe = window.electronAPI.onEvent((event: IEvent) => {
            if (event.type === 'update-available') {
                setUpdateAvailable(true);
            }
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="h-6 bg-ide-accent text-white flex items-center justify-between px-2 text-xs select-none z-20">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 cursor-pointer hover:bg-white/10 px-1 rounded transition-colors">
                    <GitBranch size={14} /> master
                </div>
                <div className="flex items-center gap-1 cursor-pointer hover:bg-white/10 px-1 rounded transition-colors">
                    <CheckCircle2 size={14} /> 0 Errors, 0 Warnings
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                {updateAvailable && (
                    <div 
                        className="flex items-center gap-1 cursor-pointer hover:bg-white/10 px-1 rounded transition-colors"
                        title="Update Available"
                        onClick={() => window.electronAPI.executeCommand('updater.downloadUpdate')}
                    >
                        <DownloadCloud size={14} /> Update Available
                    </div>
                )}
                <div className="cursor-pointer hover:bg-white/10 px-1 rounded transition-colors">
                    UTF-8
                </div>
                <div className="cursor-pointer hover:bg-white/10 px-1 rounded transition-colors">
                    Java
                </div>
                <div className="flex items-center cursor-pointer hover:bg-white/10 px-1 rounded transition-colors">
                    <Bell size={14} />
                </div>
            </div>
        </div>
    );
};
