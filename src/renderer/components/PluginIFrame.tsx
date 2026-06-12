import React, { useRef, useEffect } from 'react';

interface PluginIFrameProps {
    pluginId: string;
    uiEntry: string;
}

export const PluginIFrame: React.FC<PluginIFrameProps> = ({ pluginId, uiEntry }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const handleIpcMessage = (event: MessageEvent) => {
            // Very basic validation - in production, ensure origin is matched
            if (event.source !== iframeRef.current?.contentWindow) return;

            const { type, payload } = event.data;

            // Example bridging logic: The iframe sends { type: 'sdk.execute', payload: { command: 'xyz', args: [] } }
            if (type === 'sdk.execute') {
                window.electronAPI.executeCommand(payload.command, ...payload.args)
                    .then(res => {
                        (event.source as WindowProxy)?.postMessage({ type: 'sdk.response', id: payload.id, response: res }, '*');
                    })
                    .catch(err => {
                        (event.source as WindowProxy)?.postMessage({ type: 'sdk.error', id: payload.id, error: err.message }, '*');
                    });
            }
        };

        window.addEventListener('message', handleIpcMessage);
        return () => window.removeEventListener('message', handleIpcMessage);
    }, [pluginId]);

    // Construct the URL to load the local plugin UI file securely
    // We assume the main process serves `/.plugins/:id/:uiEntry` via a custom protocol or local server.
    // For this boilerplate, we'll just use a dummy URL.
    const pluginUrl = `http://localhost:5173/plugins/${pluginId}/${uiEntry}`;

    return (
        <iframe 
            ref={iframeRef}
            src={pluginUrl}
            sandbox="allow-scripts allow-forms allow-same-origin"
            className="w-full h-full border-none outline-none"
            title={`Plugin: ${pluginId}`}
        />
    );
};
