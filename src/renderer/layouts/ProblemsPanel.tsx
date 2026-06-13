import React from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

export const ProblemsPanel: React.FC = () => {
    const { problems, setActiveTab } = useWorkspaceStore();

    const getIcon = (severity: string) => {
        switch (severity) {
            case 'error': return <AlertCircle size={14} className="text-[#cd3131]" />;
            case 'warning': return <AlertTriangle size={14} className="text-[#cca700]" />;
            case 'info': return <Info size={14} className="text-[#3794ff]" />;
            default: return <Info size={14} className="text-ide-text-muted" />;
        }
    };

    const handleDoubleClick = (path: string) => {
        // Open the tab. Monaco could theoretically be forced to jump to line,
        // but for now, just activating the tab is a good start.
        setActiveTab(path);
        // Note: Jumping to line requires passing line/col to CodeEditor, maybe in a future iteration
    };

    if (problems.length === 0) {
        return (
            <div className="flex-1 w-full h-full bg-ide-bg p-4 overflow-y-auto flex items-center justify-center text-ide-text-muted select-none">
                No problems have been detected in the workspace so far.
            </div>
        );
    }

    return (
        <div className="flex-1 w-full h-full bg-ide-bg p-2 overflow-y-auto font-mono text-sm">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-ide-border text-ide-text-muted text-xs">
                        <th className="pb-2 font-normal w-6"></th>
                        <th className="pb-2 font-normal w-1/4">File</th>
                        <th className="pb-2 font-normal">Message</th>
                        <th className="pb-2 font-normal w-32">Source</th>
                    </tr>
                </thead>
                <tbody>
                    {problems.map((prob) => {
                        const fileName = prob.path.split(/[\\/]/).pop();
                        return (
                            <tr 
                                key={prob.id} 
                                className="border-b border-[#2d2d2d] hover:bg-ide-hover cursor-pointer"
                                onDoubleClick={() => handleDoubleClick(prob.path)}
                            >
                                <td className="py-1.5 align-top">{getIcon(prob.severity)}</td>
                                <td className="py-1.5 align-top text-ide-text-bright">
                                    {fileName} <span className="text-ide-text-muted text-xs">[{prob.line}:{prob.col}]</span>
                                </td>
                                <td className="py-1.5 align-top text-ide-text">{prob.message}</td>
                                <td className="py-1.5 align-top text-ide-text-muted text-xs">{prob.source}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
