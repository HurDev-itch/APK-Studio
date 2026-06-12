import React from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceStore } from '../store/workspaceStore';

export const TitleBar: React.FC = () => {
  const { t } = useTranslation('common');
  const workspaceRoot = useWorkspaceStore(state => state.workspaceRoot);

  const handleMinimize = () => {
    window.electronAPI.executeCommand('window.minimize');
  };

  const handleMaximize = () => {
    window.electronAPI.executeCommand('window.maximize');
  };

  const handleClose = () => {
    window.electronAPI.executeCommand('window.close');
  };

  return (
    <div 
      className="h-8 bg-[#1e1e1e] flex items-center justify-between border-b border-[#2d2d2d] select-none text-[#cccccc] text-xs"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App Icon & Title */}
      <div className="flex items-center pl-3 flex-1 overflow-hidden whitespace-nowrap text-ellipsis">
        <svg className="w-4 h-4 mr-2 text-[#4CAF50]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.523 15.3414C17.523 15.3414 16.0336 17.5543 12.0153 17.5543C7.99696 17.5543 6.4673 15.3414 6.4673 15.3414L3.89668 19.8665C3.89668 19.8665 6.40263 21.9961 12.0153 21.9961C17.628 21.9961 20.0936 19.8665 20.0936 19.8665L17.523 15.3414ZM11.9669 2.00391C6.26257 2.00391 3.86438 4.25433 3.86438 4.25433L6.50566 8.71802C6.50566 8.71802 8.02677 6.44498 11.9669 6.44498C15.907 6.44498 17.5233 8.71802 17.5233 8.71802L20.103 4.25433C20.103 4.25433 17.6713 2.00391 11.9669 2.00391ZM21.9961 11.9999C21.9961 6.47167 19.9213 4.02083 19.9213 4.02083L15.3959 6.59128C15.3959 6.59128 17.6083 8.12061 17.6083 11.9999C17.6083 15.8791 15.3959 17.4084 15.3959 17.4084L19.9213 19.9789C19.9213 19.9789 21.9961 17.5281 21.9961 11.9999ZM2.00391 11.9999C2.00391 17.4913 4.10444 19.9537 4.10444 19.9537L8.60172 17.3789C8.60172 17.3789 6.38883 15.8569 6.38883 11.9999C6.38883 8.14291 8.60172 6.62088 8.60172 6.62088L4.10444 4.04614C4.10444 4.04614 2.00391 6.50854 2.00391 11.9999Z" />
        </svg>
        <span className="font-semibold text-white tracking-wide">{t('app.title')}</span>
        {workspaceRoot && (
          <>
            <span className="mx-2 text-[#666666]">|</span>
            <span className="text-[#a0a0a0]">{workspaceRoot.split(/[\\/]/).pop()}</span>
          </>
        )}
      </div>

      {/* Window Controls */}
      <div 
        className="flex h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button 
          onClick={handleMinimize}
          className="w-12 h-full flex items-center justify-center hover:bg-[#3c3c3c] transition-colors focus:outline-none"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M0,5 L10,5 L10,6 L0,6 Z" />
          </svg>
        </button>
        <button 
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center hover:bg-[#3c3c3c] transition-colors focus:outline-none"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M1,1 L9,1 L9,9 L1,9 Z M2,2 L8,2 L8,8 L2,8 Z" fillRule="evenodd" />
          </svg>
        </button>
        <button 
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center hover:bg-[#e81123] hover:text-white transition-colors focus:outline-none"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M1,1 L9,9 M9,1 L1,9" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
};
