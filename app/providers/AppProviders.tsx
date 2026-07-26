import React from 'react';
import { ToastProvider } from '../../components/ui';
import { SessionProvider } from './SessionProvider';
import { WorkspaceProvider } from './WorkspaceProvider';

/**
 * Provider stack, outermost first:
 * toasts (no dependencies) -> session (who) -> workspace (their content).
 */
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    <SessionProvider>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </SessionProvider>
  </ToastProvider>
);
