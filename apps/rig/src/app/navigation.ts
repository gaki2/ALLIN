import { startTransition, useState } from 'react';

export const appPaths = {
  skills: 'skills',
  agents: 'agents',
  apps: 'apps',
  dashboard: 'dashboard',
} as const;

export type AppPath = (typeof appPaths)[keyof typeof appPaths];

export const useAppNavigation = (initialPath: AppPath = appPaths.skills) => {
  const [currentPath, setCurrentPath] = useState<AppPath>(initialPath);

  const navigate = (path: AppPath) => {
    startTransition(() => setCurrentPath(path));
  };

  return {
    currentPath,
    navigate,
    isCurrentPath: (path: AppPath) => currentPath === path,
  };
};
