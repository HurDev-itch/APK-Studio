let electron = require("electron");
//#region src/main/preload.ts
electron.contextBridge.exposeInMainWorld("electronAPI", {
	publishEvent: (event) => electron.ipcRenderer.send("bus-event", event),
	onEvent: (callback) => {
		const handler = (_event, busEvent) => callback(busEvent);
		electron.ipcRenderer.on("bus-event", handler);
		return () => electron.ipcRenderer.removeListener("bus-event", handler);
	},
	executeCommand: (commandId, args) => electron.ipcRenderer.invoke("bus-command", {
		commandId,
		args
	})
});
//#endregion
