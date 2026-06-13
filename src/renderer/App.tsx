
import { Sidebar } from './layouts/Sidebar';
import { EditorArea } from './layouts/EditorArea';
import { BottomPanel } from './layouts/BottomPanel';
import { ActivityBar } from './layouts/ActivityBar';
import { StatusBar } from './layouts/StatusBar';
import { TitleBar } from './layouts/TitleBar';
import { MenuBar } from './layouts/MenuBar';
import { AIPanel } from './layouts/AIPanel';
import { WelcomeScreen } from './layouts/WelcomeScreen';
import { CommandPalette } from './components/CommandPalette';
import { UpdateNotification } from './components/UpdateNotification';
import { useWorkspaceStore } from './store/workspaceStore';

function App() {
  const { showAIPanel, toggleAIPanel, workspaceRoot } = useWorkspaceStore();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden select-none bg-ide-bg text-ide-text font-sans">
      {/* Custom Titlebar and Menubar */}
      <TitleBar />
      <MenuBar />

      {/* Main Content — either Welcome or full IDE */}
      {workspaceRoot ? (
        <div className="flex-1 flex overflow-hidden">
          <ActivityBar />
          <Sidebar />
          
          <div className="flex-1 relative overflow-hidden min-w-0 z-0">
            <div className="absolute inset-0 flex flex-col">
              <EditorArea />
            </div>
            <BottomPanel />
          </div>
          
          {showAIPanel && <AIPanel onClose={toggleAIPanel} />}
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative overflow-hidden min-w-0">
            <div className="absolute inset-0 flex flex-col">
              <WelcomeScreen />
            </div>
            <BottomPanel />
          </div>
        </div>
      )}

      <StatusBar />
      <CommandPalette />
      <UpdateNotification />
    </div>
  );
}

export default App;
