import { IEvent, ICommandRequest, ICommandResponse } from '../shared/bus/types';

declare global {
    interface Window {
        electronAPI: {
            publishEvent: (event: IEvent) => void;
            onEvent: (callback: (event: IEvent) => void) => () => void;
            executeCommand: (commandId: string, args?: any) => Promise<ICommandResponse>;
        }
    }
}

export {};
