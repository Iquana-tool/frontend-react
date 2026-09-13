import React from 'react';
import WorkspaceShell from '../workspace/WorkspaceShell';

/**
 * Entry point for the annotation workspace.
 *
 * Kept as a thin wrapper so the page and the route stay unchanged while the
 * shell owns the layout.
 */
const MainLayout = () => <WorkspaceShell />;

export default MainLayout;
