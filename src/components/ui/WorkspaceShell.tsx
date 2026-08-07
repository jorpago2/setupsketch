import type { ReactNode } from "react";

type WorkspaceShellProps = {
  children: ReactNode;
  titleId?: string;
};

/** Stable application shell. Feature panels stay inside; layout remains declarative. */
export function WorkspaceShell({ children, titleId = "app-title" }: WorkspaceShellProps) {
  return <main className="app-shell" aria-labelledby={titleId}>{children}</main>;
}
