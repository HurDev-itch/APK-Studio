import { useEffect, useState } from 'react';
import { Package, Download, FolderOpen, RefreshCw, ChevronDown, ChevronRight, HardDriveDownload } from 'lucide-react';

interface SdkPackageInfo {
    name: string;
    version: string;
    description: string;
    installed: boolean;
}

interface SdkStatus {
    sdkRoot: string;
    hasSdkManager: boolean;
}

export const SDKManagerPanel = () => {
    const [status, setStatus] = useState<SdkStatus | null>(null);
    const [installed, setInstalled] = useState<SdkPackageInfo[]>([]);
    const [available, setAvailable] = useState<SdkPackageInfo[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        'Platforms': true,
        'System Images': true,
    });
    const [installProgress, setInstallProgress] = useState<{pkg: string, percent: number} | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const statusRes = await window.electronAPI.executeCommand('sdk.getStatus');
            if (statusRes && statusRes.data) setStatus(statusRes.data);

            if (statusRes?.data?.hasSdkManager) {
                const packagesRes = await window.electronAPI.executeCommand('sdk.listPackages');
                if (packagesRes && packagesRes.data) {
                    setInstalled(packagesRes.data.installed || []);
                    setAvailable(packagesRes.data.available || []);
                }
            }
        } catch (e) {
            console.error('Failed to load SDK data', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        const unsubscribe = window.electronAPI.onEvent((event) => {
            if (event.type === 'SDK_INSTALL_PROGRESS') {
                const { step, percent } = event.payload;
                if (step === 'install' || step === 'environment') {
                    // Extract package name from message if possible, or just use a generic 'Installing'
                    const match = event.payload.message.match(/Installing ([\w;-]+)/);
                    setInstallProgress({
                        pkg: match ? match[1] : 'package',
                        percent
                    });
                    if (percent === 100) {
                        setTimeout(() => setInstallProgress(null), 1000);
                        setTimeout(loadData, 1000);
                    }
                }
            }
        });

        return () => unsubscribe();
    }, []);

    const handleBootstrap = async () => {
        setIsLoading(true);
        try {
            await window.electronAPI.executeCommand('sdk.bootstrap');
            await loadData();
        } catch (e) {
            console.error('Bootstrap failed', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInstall = async (pkgName: string) => {
        try {
            await window.electronAPI.executeCommand('sdk.installPackage', pkgName);
            // Progress is handled by event listener
        } catch (e) {
            console.error('Install failed', e);
        }
    };

    const handleAcceptLicenses = async () => {
        try {
            await window.electronAPI.executeCommand('sdk.acceptLicenses');
            alert('Licenses accepted.');
        } catch (e) {
            console.error('Accept licenses failed', e);
        }
    };

    const handleInstallDefault = async () => {
        try {
            await window.electronAPI.executeCommand('sdk.installDefaultEnvironment');
        } catch (e) {
            console.error('Install default env failed', e);
        }
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    const categorizePackages = (packages: SdkPackageInfo[]) => {
        const categories: Record<string, SdkPackageInfo[]> = {
            'Platforms': [],
            'System Images': [],
            'Build Tools': [],
            'Extras': [],
            'Other': []
        };

        for (const pkg of packages) {
            if (pkg.name.startsWith('platforms;')) categories['Platforms'].push(pkg);
            else if (pkg.name.startsWith('system-images;')) categories['System Images'].push(pkg);
            else if (pkg.name.startsWith('build-tools;')) categories['Build Tools'].push(pkg);
            else if (pkg.name.startsWith('extras;')) categories['Extras'].push(pkg);
            else categories['Other'].push(pkg);
        }

        // Remove empty categories
        for (const key of Object.keys(categories)) {
            if (categories[key].length === 0) delete categories[key];
        }
        return categories;
    };

    const availableCategories = categorizePackages(available);

    return (
        <div className="flex-1 flex flex-col h-full bg-ide-surface relative">
            <div className="text-[11px] uppercase font-semibold text-ide-text-muted px-4 py-2 tracking-wider flex items-center justify-between border-b border-ide-border">
                <div className="flex items-center gap-2">
                    <Package size={14} />
                    <span>SDK Manager</span>
                </div>
                <button 
                    onClick={loadData}
                    className="p-1 hover:bg-ide-hover rounded text-ide-text-muted hover:text-white transition-colors"
                    title="Refresh"
                >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="p-4 border-b border-ide-border bg-[#1e1e1e] flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-ide-text-muted">
                    <FolderOpen size={14} />
                    <span className="font-mono truncate">{status?.sdkRoot || 'Detecting...'}</span>
                </div>
                
                {!status?.hasSdkManager && !isLoading && (
                    <div className="mt-2 bg-amber-900/20 border border-amber-900/50 p-3 rounded flex items-start gap-3">
                        <HardDriveDownload size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-bold text-amber-500">Android SDK Missing</span>
                            <span className="text-xs text-ide-text-muted">Command-line tools are required to manage SDK packages.</span>
                            <button 
                                onClick={handleBootstrap}
                                className="self-start py-1 px-3 bg-[#007fd4] hover:bg-[#118ce0] text-white rounded text-xs mt-1"
                            >
                                Bootstrap SDK Tools
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                
                {installProgress && (
                    <div className="bg-[#007fd4]/10 border border-[#007fd4] rounded p-3 flex flex-col gap-2">
                        <div className="flex justify-between text-xs text-[#007fd4] font-bold">
                            <span>Installing {installProgress.pkg}...</span>
                            <span>{installProgress.percent}%</span>
                        </div>
                        <div className="w-full bg-[#1e1e1e] rounded h-1">
                            <div className="bg-[#007fd4] h-full transition-all duration-300" style={{ width: `${installProgress.percent}%` }} />
                        </div>
                    </div>
                )}

                {status?.hasSdkManager && (
                    <>
                        <div className="flex flex-col gap-2">
                            <h3 className="text-xs font-bold text-ide-text-muted uppercase tracking-wider">Installed Packages ({installed.length})</h3>
                            <div className="border border-[#3e3e42] rounded overflow-hidden">
                                {installed.map((pkg, i) => (
                                    <div key={pkg.name} className={`flex flex-col p-2 ${i !== installed.length - 1 ? 'border-b border-[#3e3e42]' : ''} hover:bg-[#2a2d2e]`}>
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs text-white font-mono">{pkg.name}</span>
                                            <span className="text-[10px] text-ide-text-muted">{pkg.version}</span>
                                        </div>
                                        <span className="text-[10px] text-ide-text-muted mt-1">{pkg.description}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <h3 className="text-xs font-bold text-ide-text-muted uppercase tracking-wider mt-4">Available Packages</h3>
                            
                            <div className="flex flex-col gap-1 border border-[#3e3e42] rounded overflow-hidden">
                                {Object.entries(availableCategories).map(([catName, packages]) => (
                                    <div key={catName} className="flex flex-col">
                                        <div 
                                            className="flex items-center gap-2 p-2 bg-[#252526] hover:bg-[#2a2d2e] cursor-pointer border-b border-[#3e3e42]"
                                            onClick={() => toggleCategory(catName)}
                                        >
                                            {expandedCategories[catName] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            <span className="text-xs font-bold text-white">{catName} ({packages.length})</span>
                                        </div>
                                        
                                        {expandedCategories[catName] && (
                                            <div className="flex flex-col">
                                                {packages.map(pkg => (
                                                    <div key={pkg.name} className="flex flex-col p-2 border-b border-[#3e3e42] hover:bg-[#2a2d2e] pl-6">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-ide-text-bright font-mono">{pkg.name}</span>
                                                                <span className="text-[10px] text-ide-text-muted mt-1">{pkg.description}</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleInstall(pkg.name)}
                                                                className="flex items-center gap-1 text-[10px] bg-[#007fd4]/20 text-[#007fd4] hover:bg-[#007fd4] hover:text-white px-2 py-1 rounded transition-colors ml-2"
                                                            >
                                                                <Download size={12} /> Install
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {status?.hasSdkManager && (
                <div className="p-4 border-t border-ide-border bg-[#1e1e1e] flex flex-col gap-2">
                    <div className="flex gap-2">
                        <button 
                            className="flex-1 py-1.5 bg-[#3c3c3c] hover:bg-[#4a4a4a] text-white rounded text-xs transition-colors"
                            onClick={handleAcceptLicenses}
                        >
                            Accept Licenses
                        </button>
                        <button 
                            className="flex-1 py-1.5 bg-[#007fd4] hover:bg-[#118ce0] text-white rounded text-xs transition-colors"
                            onClick={handleInstallDefault}
                        >
                            Install Default Env
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
