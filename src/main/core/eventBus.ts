import { ipcMain, BrowserWindow } from 'electron';
import type { WebContents } from 'electron';
import type { IEvent, EventHandler } from '../../shared/bus/types';

class EventBusMain {
    private handlers: Map<string, EventHandler[]> = new Map();

    constructor() {
        // Listen to events coming from the renderer
        ipcMain.on('bus-event', (_e, event: IEvent) => {
            this.emitLocal(event);
        });
    }

    public subscribe(type: string, handler: EventHandler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, []);
        }
        this.handlers.get(type)!.push(handler);
    }

    public unsubscribe(type: string, handler: EventHandler) {
        const typeHandlers = this.handlers.get(type);
        if (typeHandlers) {
            this.handlers.set(type, typeHandlers.filter(h => h !== handler));
        }
    }

    // Emit event locally in the main process AND broadcast to ALL renderer windows
    public publish(event: IEvent, renderers?: WebContents[]) {
        event.source = event.source || 'main';
        this.emitLocal(event);
        
        if (renderers && renderers.length > 0) {
            // Send to specific renderers
            renderers.forEach(contents => {
                if (!contents.isDestroyed()) {
                    contents.send('bus-event', event);
                }
            });
        } else {
            // Broadcast to ALL open BrowserWindows
            const allWindows = BrowserWindow.getAllWindows();
            for (const win of allWindows) {
                if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
                    win.webContents.send('bus-event', event);
                }
            }
        }
    }

    private emitLocal(event: IEvent) {
        const typeHandlers = this.handlers.get(event.type);
        if (typeHandlers) {
            typeHandlers.forEach(handler => handler(event));
        }
    }
}

export const eventBus = new EventBusMain();
