import React, { useEffect, useState } from 'react';
import { Package, ShieldAlert, Cpu, Layers } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

export const AnalyzerView: React.FC = () => {
    const { workspaceRoot } = useWorkspaceStore();
    const [apkInfo, setApkInfo] = useState<any>(null);

    useEffect(() => {
        if (workspaceRoot) {
            window.electronAPI.executeCommand('analyzer.getApkInfo', workspaceRoot).then(res => {
                if (res.success) {
                    setApkInfo(res.data);
                }
            });
        }
    }, [workspaceRoot]);

    if (!apkInfo) {
        return (
            <div className="h-full flex items-center justify-center text-ide-text-muted">
                Loading APK info...
            </div>
        );
    }

    return (
        <div className="h-full p-8 overflow-y-auto text-ide-text bg-ide-bg select-text">
            <h1 className="text-2xl text-white font-semibold mb-8 flex items-center gap-3">
                <Package size={28} className="text-ide-accent" />
                APK Analyzer
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Basic Info Card */}
                <div className="bg-ide-surface border border-ide-border rounded-lg p-5">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 border-b border-ide-border pb-2">
                        <Layers size={16} /> Basic Information
                    </h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-ide-text-muted">Package Name</span>
                            <span className="font-mono text-ide-text-bright break-all ml-4">{apkInfo.packageName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-ide-text-muted">Version Code</span>
                            <span className="font-mono text-ide-text-bright">{apkInfo.versionCode}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-ide-text-muted">Version Name</span>
                            <span className="font-mono text-ide-text-bright">{apkInfo.versionName}</span>
                        </div>
                    </div>
                </div>

                {/* SDK Info Card */}
                <div className="bg-ide-surface border border-ide-border rounded-lg p-5">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 border-b border-ide-border pb-2">
                        <Cpu size={16} /> SDK & Requirements
                    </h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-ide-text-muted">Min SDK</span>
                            <span className="font-mono text-ide-text-bright bg-[#2a2d2e] px-2 py-0.5 rounded">API {apkInfo.minSdk}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-ide-text-muted">Target SDK</span>
                            <span className="font-mono text-ide-text-bright bg-[#2a2d2e] px-2 py-0.5 rounded">API {apkInfo.targetSdk}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Permissions */}
            <div className="bg-ide-surface border border-ide-border rounded-lg p-5">
                <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 border-b border-ide-border pb-2">
                    <ShieldAlert size={16} /> Permissions ({apkInfo.permissions?.length || 0})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-2">
                    {apkInfo.permissions && apkInfo.permissions.map((perm: string) => (
                        <div key={perm} className="bg-ide-bg border border-ide-border px-3 py-2 rounded text-xs font-mono text-ide-text-bright truncate" title={perm}>
                            {perm.split('.').pop()}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
