import React, { useState, useEffect } from 'react';
import { Smartphone, Check, Loader2, RefreshCw, Cpu, Database, HardDrive, AlertTriangle } from 'lucide-react';

interface Preset {
    id: string;
    label: string;
    description: string;
    device: string;
    apiLevel: number;
    abi: string;
    ram: number;
    storage: number;
}

interface DeviceSetupWizardProps {
    onClose: () => void;
    onComplete: () => void;
}

export const DeviceSetupWizard: React.FC<DeviceSetupWizardProps> = ({ onClose, onComplete }) => {
    const [step, setStep] = useState<'welcome' | 'presets' | 'progress' | 'complete' | 'error'>('welcome');
    const [presets, setPresets] = useState<Preset[]>([]);
    const [progressMessage, setProgressMessage] = useState('Starting...');
    const [progressPercent, setProgressPercent] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchPresets = async () => {
            const res = await window.electronAPI.executeCommand('avd.getPresets');
            if (res && res.data) {
                setPresets(res.data);
            }
        };
        fetchPresets();

        // Handle Escape key
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && (step === 'welcome' || step === 'complete' || step === 'presets')) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, step]);

    useEffect(() => {
        // Listen to progress events
        const unsubscribe = window.electronAPI.onEvent((event) => {
            if (event.type === 'SDK_INSTALL_PROGRESS') {
                setProgressMessage(event.payload.message);
                setProgressPercent(event.payload.percent);
            }
        });
        return () => unsubscribe();
    }, []);

    const startSetup = async (presetId: string) => {
        setStep('progress');
        setProgressPercent(0);
        setProgressMessage('Bootstrapping SDK...');

        try {
            const res = await window.electronAPI.executeCommand('avd.quickSetup', presetId);
            if (res.success) {
                setStep('complete');
            } else {
                setErrorMessage(res.error || 'Unknown error occurred during setup');
                setStep('error');
            }
        } catch (e: any) {
            setErrorMessage(e.message || 'Setup failed');
            setStep('error');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-8">
            <div className="bg-ide-surface border border-ide-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                
                {step === 'welcome' && (
                    <div className="p-12 flex flex-col items-center text-center">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                            <Smartphone size={80} className="text-[#007fd4] relative z-10" strokeWidth={1} />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">No Android Virtual Devices Found</h2>
                        <p className="text-ide-text-muted text-base mb-10 max-w-md">
                            Create your first emulator to start testing APKs and debugging applications directly from APK Studio.
                        </p>
                        <div className="flex gap-4 w-full max-w-sm">
                            <button 
                                onClick={() => startSetup('balanced')}
                                className="flex-1 py-3 px-4 bg-gradient-to-r from-[#007fd4] to-[#094771] hover:from-[#118ce0] hover:to-[#0a588f] text-white rounded font-medium shadow-lg transition-transform active:scale-95"
                            >
                                Quick Setup
                            </button>
                            <button 
                                onClick={() => setStep('presets')}
                                className="flex-1 py-3 px-4 border border-[#3e3e42] hover:bg-ide-hover text-ide-text-bright rounded font-medium transition-colors"
                            >
                                Advanced Setup
                            </button>
                        </div>
                    </div>
                )}

                {step === 'presets' && (
                    <div className="p-8 flex flex-col">
                        <h2 className="text-xl font-bold text-white mb-2">Select a Device Profile</h2>
                        <p className="text-ide-text-muted text-sm mb-6">Choose a preset or create a custom device later from the Device Manager.</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                            {presets.map(preset => (
                                <div 
                                    key={preset.id}
                                    className="p-4 border border-[#3e3e42] rounded-lg hover:border-[#007fd4] hover:bg-[#007fd4]/10 cursor-pointer transition-all group"
                                    onClick={() => startSetup(preset.id)}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <Smartphone className="text-[#007fd4]" size={20} />
                                        <h3 className="font-bold text-white text-sm">{preset.label}</h3>
                                    </div>
                                    <p className="text-xs text-ide-text-muted mb-4">{preset.description}</p>
                                    
                                    <div className="flex items-center gap-4 text-xs text-ide-text-muted">
                                        <div className="flex items-center gap-1"><Cpu size={12}/> {preset.abi}</div>
                                        <div className="flex items-center gap-1"><Database size={12}/> {Math.round(preset.ram / 1024)}GB</div>
                                        <div className="flex items-center gap-1"><HardDrive size={12}/> {Math.round(preset.storage / 1024)}GB</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={() => setStep('welcome')}
                                className="py-2 px-6 border border-[#3e3e42] hover:bg-ide-hover text-ide-text-bright rounded text-sm transition-colors"
                            >
                                Back
                            </button>
                        </div>
                    </div>
                )}

                {step === 'progress' && (
                    <div className="p-12 flex flex-col items-center text-center">
                        <Loader2 size={48} className="text-[#007fd4] animate-spin mb-6" />
                        <h2 className="text-2xl font-bold text-white mb-2">Setting up your environment</h2>
                        <p className="text-ide-text-muted text-sm mb-12 max-w-md">
                            This may take several minutes depending on your internet connection. We are downloading the Android SDK, system images, and configuring the virtual device.
                        </p>
                        
                        <div className="w-full max-w-md bg-[#1e1e1e] rounded overflow-hidden h-2 mb-4 border border-[#3e3e42]">
                            <div 
                                className="h-full bg-[#007fd4] transition-all duration-300 ease-out" 
                                style={{ width: `${progressPercent}%` }} 
                            />
                        </div>
                        <div className="w-full max-w-md flex justify-between text-xs text-ide-text-muted font-mono">
                            <span className="truncate pr-4">{progressMessage}</span>
                            <span className="shrink-0">{progressPercent}%</span>
                        </div>
                    </div>
                )}

                {step === 'error' && (
                    <div className="p-12 flex flex-col items-center text-center">
                        <AlertTriangle size={64} className="text-red-500 mb-6" />
                        <h2 className="text-2xl font-bold text-white mb-4">Setup Failed</h2>
                        <div className="bg-red-900/20 border border-red-900/50 rounded p-4 mb-8 w-full max-w-md text-left overflow-auto max-h-32">
                            <p className="text-red-400 text-xs font-mono">{errorMessage}</p>
                        </div>
                        <div className="flex gap-4">
                            <button 
                                onClick={onClose}
                                className="py-2 px-6 border border-[#3e3e42] hover:bg-ide-hover text-ide-text-bright rounded font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => startSetup('balanced')}
                                className="py-2 px-6 bg-[#007fd4] hover:bg-[#118ce0] text-white rounded font-medium transition-colors flex items-center gap-2"
                            >
                                <RefreshCw size={16} /> Retry
                            </button>
                        </div>
                    </div>
                )}

                {step === 'complete' && (
                    <div className="p-12 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500 delay-150">
                            <Check size={40} className="text-green-500" strokeWidth={3} />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">Your emulator is ready! 🎉</h2>
                        <p className="text-ide-text-muted text-base mb-10">
                            The device has been successfully created and started. You can now build, install, and test your APKs.
                        </p>
                        <button 
                            onClick={onComplete}
                            className="py-3 px-8 bg-[#007fd4] hover:bg-[#118ce0] text-white rounded font-medium shadow-lg transition-transform active:scale-95"
                        >
                            Get Started
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};
