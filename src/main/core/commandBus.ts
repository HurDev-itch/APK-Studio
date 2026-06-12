import { ipcMain } from 'electron';
import type { CommandHandler, ICommandRequest, ICommandResponse } from '../../shared/bus/types';

class CommandBusMain {
    private handlers: Map<string, CommandHandler> = new Map();

    constructor() {
        // Handle command requests from renderer via IPC
        ipcMain.handle('bus-command', async (_e, request: ICommandRequest): Promise<ICommandResponse> => {
            return this.execute(request.commandId, request.args);
        });
    }

    public register(commandId: string, handler: CommandHandler) {
        if (this.handlers.has(commandId)) {
            console.warn(`Command ${commandId} is already registered. Overwriting.`);
        }
        this.handlers.set(commandId, handler);
    }

    public async execute(commandId: string, args?: any): Promise<ICommandResponse> {
        const handler = this.handlers.get(commandId);
        if (!handler) {
            return { success: false, error: `Command ${commandId} not found` };
        }

        try {
            const result = await handler(args);
            return { success: true, data: result };
        } catch (error: any) {
            return { success: false, error: error.message || String(error) };
        }
    }
}

export const commandBus = new CommandBusMain();
