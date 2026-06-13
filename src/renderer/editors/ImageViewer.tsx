import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize, Minimize } from 'lucide-react';

interface ImageViewerProps {
    path: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ path }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [zoom, setZoom] = useState<number>(100);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadImage = async () => {
            try {
                // Determine mime type based on extension
                const ext = path.split('.').pop()?.toLowerCase();
                let mimeType = 'image/png';
                if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                if (ext === 'webp') mimeType = 'image/webp';
                if (ext === 'svg') mimeType = 'image/svg+xml';
                if (ext === 'gif') mimeType = 'image/gif';

                const response = await window.electronAPI.executeCommand('fs.readFileBase64', path);
                if (response.success) {
                    setImageSrc(`data:${mimeType};base64,${response.data}`);
                } else {
                    setError('Failed to load image: ' + response.error);
                }
            } catch (err: any) {
                setError(err.message || 'Unknown error loading image');
            }
        };
        loadImage();
    }, [path]);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 500));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 10));
    const handleZoomReset = () => setZoom(100);
    const handleFitScreen = () => {
        // Simple fit to screen logic could go here
        // For now, reset to 100% or implement CSS object-fit
        setZoom(100);
    };

    if (error) {
        return <div className="h-full flex items-center justify-center text-red-400 p-8 text-center">{error}</div>;
    }

    if (!imageSrc) {
        return <div className="h-full flex items-center justify-center text-gray-500">Loading...</div>;
    }

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e]">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#252526] border-b border-[#3e3e42] text-xs text-gray-300">
                <button onClick={handleZoomOut} className="p-1 hover:bg-[#37373d] rounded"><ZoomOut size={16} /></button>
                <span className="w-12 text-center">{zoom}%</span>
                <button onClick={handleZoomIn} className="p-1 hover:bg-[#37373d] rounded"><ZoomIn size={16} /></button>
                <div className="w-px h-4 bg-[#3e3e42] mx-2" />
                <button onClick={handleZoomReset} className="p-1 hover:bg-[#37373d] rounded" title="Actual Size"><Maximize size={16} /></button>
                <button onClick={handleFitScreen} className="p-1 hover:bg-[#37373d] rounded" title="Fit to Screen"><Minimize size={16} /></button>
                <span className="ml-auto text-gray-500">{path.split(/[\/\\]/).pop()}</span>
            </div>
            
            <div className="flex-1 overflow-auto flex items-center justify-center p-8 relative" style={{ backgroundImage: 'radial-gradient(#3e3e42 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <img 
                    src={imageSrc} 
                    alt="Preview" 
                    className="max-w-none transition-transform duration-200"
                    style={{ transform: `scale(${zoom / 100})`, imageRendering: zoom > 100 ? 'pixelated' : 'auto' }}
                />
            </div>
        </div>
    );
};
