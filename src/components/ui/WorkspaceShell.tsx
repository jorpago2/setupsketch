import type { ReactNode } from "react";

type WorkspaceShellProps = {
  children: ReactNode;
};

/** Stable application shell. Feature panels stay inside; layout remains declarative. */
export function WorkspaceShell({ children }: WorkspaceShellProps) {
  return <div className="app-shell">{children}</div>;
}
