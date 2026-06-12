import { contextBridge, ipcRenderer } from 'electron';
import type { IEvent, ICommandRequest, ICommandResponse } from '../shared/bus/types';

contextBridge.exposeInMainWorld('electronAPI', {
    // Event Bus
    publishEvent: (event: IEvent) => ipcRenderer.send('bus-event', event),
    onEvent: (callback: (event: IEvent) => void) => {
        const handler = (_event: any, busEvent: IEvent) => callback(busEvent);
        ipcRenderer.on('bus-event', handler);
        return () => ipcRenderer.removeListener('bus-event', handler); // return unsubscribe function
    },

    // Command Bus
    executeCommand: (commandId: string, args?: any): Promise<ICommandResponse> => 
        ipcRenderer.invoke('bus-command', { commandId, args } as ICommandRequest)
});
