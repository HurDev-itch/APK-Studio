# APK Studio Plugin Development Guide

Welcome to the APK Studio Plugin Development guide! This document explains how the plugin system works and how you can extend the IDE with powerful new features, backend automation, AI capabilities, and custom UI views.

---

## 1. Plugin Architecture

Plugins in APK Studio operate in a sandboxed but highly integrated environment. A plugin can consist of:
- **Background Worker (`main`)**: A Node.js worker thread that handles heavy computation, filesystem access, IPC communication, and command execution.
- **UI View (`ui`)**: An embedded view (like an iframe or React component) that provides custom frontend interfaces inside the editor.

### Installation Directory
Plugins are installed and loaded directly from the `.plugins/` directory at the root of any open workspace:
```text
<YourWorkspaceRoot>/.plugins/<plugin-id>/
```

---

## 2. The `plugin.json` Manifest

Every plugin requires a `plugin.json` manifest file at its root. This file tells the IDE everything it needs to know about your plugin before executing it.

```json
{
    "id": "my.custom.plugin",
    "name": "My Custom Plugin",
    "version": "1.0.0",
    "description": "An example plugin that does cool things.",
    "author": "Your Name",
    "main": "index.js",
    "ui": "ui/index.html",
    "permissions": ["workspace", "filesystem", "ai"]
}
```

### Manifest Fields
- **`id`**: Unique identifier for your plugin (e.g., `com.author.pluginName`).
- **`name`**: The display name shown in the Plugin Manager.
- **`version`**: Semantic versioning string.
- **`description`**: A short description of the plugin's features.
- **`author`**: Your name or organization.
- **`main`** *(Optional)*: Path to the Node.js entry point script relative to the plugin root.
- **`ui`** *(Optional)*: Path to the UI entry point.
- **`permissions`**: An array of requested permission scopes.

---

## 3. Permissions System

APK Studio requires plugins to explicitly declare their intentions. If a plugin requests sensitive permissions, the IDE will prompt the user to approve them before the plugin is enabled.

Available permissions:
- **`workspace`**: Access to current workspace metadata and editor state.
- **`filesystem`**: Read/write access to files within the workspace.
- **`network`**: Ability to make outbound HTTP requests.
- **`ai`**: Access to the IDE's built-in AI models (Gemini, Ollama, OpenAI).
- **`commands`**: Ability to register new Command Palette commands or execute existing ones.

---

## 4. The Plugin SDK (`PluginSDK.ts`)

For backend plugins running in the Node.js Worker, you interact with the IDE via the `PluginSDK` message-passing bridge.

### Core API Interfaces

#### Commands
Allows you to register custom commands that appear in the Command Palette, or trigger existing built-in commands.
```typescript
// Register a custom command
sdk.commands.register('myplugin.sayHello', (name) => {
    sdk.notifications.show(`Hello, ${name}!`, 'info');
});

// Execute an IDE command
await sdk.commands.execute('fs.writeFile', { filePath: 'foo.txt', content: 'hello' });
```

#### Events
Listen to IDE events or emit your own custom events across the IPC bridge.
```typescript
// Listen for file changes
sdk.events.on('workspace.fileChanged', (path) => {
    console.log(`File changed: ${path}`);
});
```

#### Workspace & FileSystem
Access editor state and interact with files. *(Requires `workspace` and `filesystem` permissions)*
```typescript
const activeFile = await sdk.workspace.getActiveFilePath();
const content = await sdk.workspace.readFile(activeFile);
```

#### AI Integration
Seamlessly tap into the IDE's configured AI context to build automated analysis tools. *(Requires `ai` permission)*
```typescript
const response = await sdk.ai.chat("Summarize the active file.");
sdk.notifications.show(response);
```

#### Notifications
Display toast notifications to the user inside the IDE.
```typescript
sdk.notifications.show('Plugin successfully initialized!', 'info');
sdk.notifications.show('Failed to connect to server.', 'error');
```

---

## 5. Getting Started Example

Here is a simple example of a background plugin (`index.js`) that analyzes code using AI when triggered via a command:

```javascript
// index.js (Running inside the Node.js Worker thread)

// The IDE injects the global 'sdk' object into the worker context
if (typeof sdk !== 'undefined') {
    
    // Register a command that users can run via the Command Palette
    sdk.commands.register('myplugin.analyzeFile', async () => {
        try {
            // Get the currently open file
            const file = await sdk.workspace.getActiveFilePath();
            if (!file) {
                sdk.notifications.show('No active file to analyze!', 'warning');
                return;
            }

            const code = await sdk.workspace.readFile(file);
            sdk.notifications.show('Analyzing code...', 'info');

            // Send to AI
            const analysis = await sdk.ai.chat(`Find bugs in this code:\n${code}`);
            
            // Show result
            sdk.notifications.show(analysis, 'info');

        } catch (error) {
            sdk.notifications.show(`Error: ${error.message}`, 'error');
        }
    });

    sdk.notifications.show('AI Analyzer Plugin Loaded!', 'info');
}
```

---

## 6. Testing Your Plugin

1. Create a folder inside your workspace root: `.plugins/my.custom.plugin/`
2. Add your `plugin.json` and `index.js` scripts.
3. Open APK Studio and navigate to the **Plugins** view.
4. Click **Refresh / Scan** to detect your plugin.
5. Click **Enable**. (You will be prompted to accept the requested permissions).
6. Open the Command Palette (`Ctrl+Shift+P`) and search for your newly registered command!

---

> [!TIP]
> Make sure your `index.js` file handles errors gracefully. Since plugins run in a separate Worker thread, an unhandled rejection will crash the plugin thread, but the IDE will remain stable.

Happy Coding!
