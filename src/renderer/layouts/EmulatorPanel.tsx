import { useEffect, useState } from 'react';
import { MonitorSmartphone, Play, Square, Trash2, Smartphone, Loader2, Plus, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DeviceSetupWizard } from '../components/DeviceSetupWizard';

interface AvdInfo {
    name: string;
    device: string;
    target: string;
    abi: string;
    status: 'offline' | 'running';
}

interface PhysicalDevice {
    id: string;
    state: string;
    model: string;
    device: string;
}

interface SdkStatus {
    sdkRoot: string;
    hasSdkManager: boolean;
    defaultAbi: string;
}

export const EmulatorPanel = () => {
    const [sdkStatus, setSdkStatus] = useState<SdkStatus | null>(null);
    const [avds, setAvds] = useState<AvdInfo[]>([]);
    const [physicalDevices, setPhysicalDevices] = useState<PhysicalDevice[]>([]);
    
    const [showWizard, setShowWizard] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [createName, setCreateName] = useState('');
    const [createDevice, setCreateDevice] = useState('pixel_5');
    const [createApi, setCreateApi] = useState('35');
    const [createAbi, setCreateAbi] = useState('x86_64');
    const [createRam, setCreateRam] = useState(4096);
    const [createStorage, setCreateStorage] = useState(8192);



    const refreshData = async () => {
        try {
            const statusRes = await window.electronAPI.executeCommand('sdk.getStatus');
            if (statusRes && statusRes.data) setSdkStatus(statusRes.data);

            const avdsRes = await window.electronAPI.executeCommand('avd.list');
            if (avdsRes) {
                const list = Array.isArray(avdsRes.data) ? avdsRes.data : [];
                setAvds(list);
            }

            const physRes = await window.electronAPI.executeCommand('avd.getPhysicalDevices');
            if (physRes) {
                const list = Array.isArray(physRes.data) ? physRes.data : [];
                setPhysicalDevices(list);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Check if we need to show wizard initially
    useEffect(() => {
        if (sdkStatus && !sdkStatus.hasSdkManager && avds.length === 0 && physicalDevices.length === 0) {
            // Wait a moment to ensure it's not just loading
            const timer = setTimeout(() => {
                if (avds.length === 0 && physicalDevices.length === 0) {
                    setShowWizard(true);
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [sdkStatus, avds.length, physicalDevices.length]);

    const handleCreateAvd = async () => {
        setIsCreating(true);
        try {
            const name = createName || `${createDevice}_API_${createApi}`.replace(/\s+/g, '_');
            await window.electronAPI.executeCommand('avd.create', {
                name,
                device: createDevice,
                systemImage: `system-images;android-${createApi};google_apis;${createAbi}`,
                ram: createRam,
                internalStorage: createStorage
            });
            setShowCreateForm(false);
            setCreateName('');
            await refreshData();
        } catch (e) {
            console.error('Failed to create AVD', e);
        } finally {
            setIsCreating(false);
        }
    };

    const handleAction = async (action: string, id: string) => {
        try {
            switch (action) {
                case 'start': await window.electronAPI.executeCommand('avd.start', id); break;
                case 'stop': await window.electronAPI.executeCommand('emulator.stop', id); break;
                case 'delete': 
                    if (confirm(`Delete AVD ${id}?`)) {
                        await window.electronAPI.executeCommand('avd.delete', id); 
                    }
                    break;
                case 'wipe':
                    if (confirm(`Wipe data for ${id}? This will restart the emulator.`)) {
                        await window.electronAPI.executeCommand('avd.wipeData', id);
                    }
                    break;
            }
            // Give it a moment before refreshing
            setTimeout(refreshData, 1000);
        } catch (e) {
            console.error(`Failed to ${action} ${id}`, e);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-ide-surface relative">
            <div className="text-[11px] uppercase font-semibold text-ide-text-muted px-4 py-2 tracking-wider flex items-center gap-2 border-b border-ide-border">
                <MonitorSmartphone size={14} />
                <span>Device Manager</span>
            </div>

            {/* SDK Status Banner */}
            <div className="px-4 py-2 border-b border-ide-border bg-[#1e1e1e] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {sdkStatus?.hasSdkManager ? (
                        <>
                            <CheckCircle2 size={14} className="text-green-500" />
                            <span className="text-xs text-ide-text-bright">SDK Ready</span>
                        </>
                    ) : (
                        <>
                            <AlertCircle size={14} className="text-amber-500" />
                            <span className="text-xs text-ide-text-bright">SDK Not Installed</span>
                        </>
                    )}
                </div>
                {!sdkStatus?.hasSdkManager && (
                    <button 
                        onClick={() => setShowWizard(true)}
                        className="text-xs text-[#007fd4] hover:underline"
                    >
                        Setup Now
                    </button>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                
                {/* Physical Devices Section */}
                <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-bold text-ide-text-muted uppercase tracking-wider">Physical Devices</h3>
                    {physicalDevices.length === 0 ? (
                        <div className="text-xs text-ide-text-muted italic px-2">No physical devices connected</div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {physicalDevices.map(dev => (
                                <div key={dev.id} className="bg-[#2d2d2d] border border-[#3e3e42] rounded p-3 flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <Smartphone size={16} className="text-ide-text-bright" />
                                            <span className="text-sm font-bold text-white">{dev.model}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className={`w-2 h-2 rounded-full ${dev.state === 'device' ? 'bg-green-500' : 'bg-red-500'}`} />
                                            <span className="text-[10px] text-ide-text-muted uppercase">{dev.state === 'device' ? 'Connected' : dev.state}</span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-ide-text-muted">ID: {dev.id}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Virtual Devices Section */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-ide-text-muted uppercase tracking-wider">Virtual Devices</h3>
                        <button 
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="text-xs flex items-center gap-1 text-[#007fd4] hover:text-[#118ce0] transition-colors"
                        >
                            <Plus size={14} /> Create Device
                        </button>
                    </div>

                    {/* Create Form */}
                    {showCreateForm && (
                        <div className="bg-[#252526] border border-[#3e3e42] rounded-lg p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] uppercase text-ide-text-muted font-bold">Device Name (Optional)</label>
                                <input 
                                    type="text" 
                                    className="bg-[#3c3c3c] border border-[#3e3e42] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#007fd4]" 
                                    placeholder="e.g. My Pixel 5"
                                    value={createName}
                                    onChange={e => setCreateName(e.target.value)}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase text-ide-text-muted font-bold">Profile</label>
                                    <select className="bg-[#3c3c3c] border border-[#3e3e42] rounded px-2 py-1 text-xs text-white outline-none" value={createDevice} onChange={e => setCreateDevice(e.target.value)}>
                                        <option value="pixel_4">Pixel 4</option>
                                        <option value="pixel_5">Pixel 5</option>
                                        <option value="pixel_6">Pixel 6</option>
                                        <option value="pixel_7">Pixel 7</option>
                                        <option value="pixel_8">Pixel 8</option>
                                        <option value="pixel_8_pro">Pixel 8 Pro</option>
                                        <option value="pixel_tablet">Pixel Tablet</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase text-ide-text-muted font-bold">Android API</label>
                                    <select className="bg-[#3c3c3c] border border-[#3e3e42] rounded px-2 py-1 text-xs text-white outline-none" value={createApi} onChange={e => setCreateApi(e.target.value)}>
                                        <option value="33">Android 13 (API 33)</option>
                                        <option value="34">Android 14 (API 34)</option>
                                        <option value="35">Android 15 (API 35)</option>
                                        <option value="36">Android 16 (API 36)</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase text-ide-text-muted font-bold">Architecture</label>
                                    <select className="bg-[#3c3c3c] border border-[#3e3e42] rounded px-2 py-1 text-xs text-white outline-none" value={createAbi} onChange={e => setCreateAbi(e.target.value)}>
                                        <option value="x86_64">x86_64</option>
                                        <option value="arm64-v8a">arm64-v8a</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase text-ide-text-muted font-bold">RAM</label>
                                    <select className="bg-[#3c3c3c] border border-[#3e3e42] rounded px-2 py-1 text-xs text-white outline-none" value={createRam} onChange={e => setCreateRam(parseInt(e.target.value))}>
                                        <option value="2048">2 GB</option>
                                        <option value="4096">4 GB</option>
                                        <option value="6144">6 GB</option>
                                        <option value="8192">8 GB</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1 col-span-2">
                                    <label className="text-[10px] uppercase text-ide-text-muted font-bold">Storage</label>
                                    <select className="bg-[#3c3c3c] border border-[#3e3e42] rounded px-2 py-1 text-xs text-white outline-none" value={createStorage} onChange={e => setCreateStorage(parseInt(e.target.value))}>
                                        <option value="4096">4 GB</option>
                                        <option value="8192">8 GB</option>
                                        <option value="16384">16 GB</option>
                                        <option value="32768">32 GB</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-2">
                                <button 
                                    className="px-3 py-1 text-xs text-ide-text-bright hover:bg-ide-hover rounded"
                                    onClick={() => setShowCreateForm(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="px-3 py-1 text-xs bg-[#007fd4] hover:bg-[#118ce0] text-white rounded flex items-center gap-2"
                                    onClick={handleCreateAvd}
                                    disabled={isCreating}
                                >
                                    {isCreating && <Loader2 size={12} className="animate-spin" />}
                                    {isCreating ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </div>
                    )}

                    {avds.length === 0 ? (
                        !showCreateForm && <div className="text-xs text-ide-text-muted italic px-2">No AVDs found</div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {avds.map(avd => (
                                <div key={avd.name} className="bg-[#2d2d2d] border border-[#3e3e42] rounded p-3 flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white">{avd.name.replace(/_/g, ' ')}</span>
                                            <span className="text-[10px] text-ide-text-muted">{avd.target} • {avd.abi}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className={`w-2 h-2 rounded-full ${avd.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                                            <span className="text-[10px] text-ide-text-muted uppercase">{avd.status}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-1">
                                        {avd.status === 'offline' ? (
                                            <button 
                                                className="w-7 h-7 rounded hover:bg-[#3c3c3c] flex items-center justify-center text-green-400"
                                                onClick={() => handleAction('start', avd.name)}
                                                title="Start Emulator"
                                            >
                                                <Play size={14} fill="currentColor" />
                                            </button>
                                        ) : (
                                            <button 
                                                className="w-7 h-7 rounded hover:bg-[#3c3c3c] flex items-center justify-center text-red-400"
                                                onClick={() => handleAction('stop', `emulator-5554`)} // Simplified for UI, ideally find exact ID
                                                title="Stop Emulator"
                                            >
                                                <Square size={14} fill="currentColor" />
                                            </button>
                                        )}
                                        <button 
                                            className="w-7 h-7 rounded hover:bg-[#3c3c3c] flex items-center justify-center text-ide-text-muted hover:text-red-400"
                                            onClick={() => handleAction('delete', avd.name)}
                                            title="Delete AVD"
                                            disabled={avd.status === 'running'}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        
                                        {avd.status === 'running' && (
                                            <button 
                                                className="w-7 h-7 rounded hover:bg-[#3c3c3c] flex items-center justify-center text-ide-text-muted"
                                                onClick={() => handleAction('wipe', avd.name)}
                                                title="Wipe Data & Restart"
                                            >
                                                <RefreshCw size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showWizard && (
                <DeviceSetupWizard 
                    onClose={() => setShowWizard(false)}
                    onComplete={() => {
                        setShowWizard(false);
                        refreshData();
                    }}
                />
            )}
        </div>
    );
};
