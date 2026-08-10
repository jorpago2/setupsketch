import type { ReactNode } from "react";
import { Accordion, AccordionItem } from "@carbon/react";
import { FitToScreen, FolderOpen, Link, Redo, Undo, Upload } from "@carbon/react/icons";

const uiIcons = { undo: Undo, redo: Redo, link: Link, project: FolderOpen, export: Upload, fit: FitToScreen } as const;

export function UiIcon({ name }: { name: keyof typeof uiIcons }) {
  const Icon = uiIcons[name];
  return <Icon className="button-icon" size={16} aria-hidden={true} />;
}

export function InspectorDisclosure({ className, label, meta, buttonId, initiallyOpen = false, panelClassName = "disclosure-panel", children }: {
  className: string; label: ReactNode; meta?: ReactNode; buttonId?: string; initiallyOpen?: boolean; panelClassName?: string; children: ReactNode;
}) {
  return <Accordion align="end" isFlush size="sm" className={className}>
    <AccordionItem open={initiallyOpen} title={<span id={buttonId} className="disclosure-title"><span>{label}</span>{meta !== undefined && <span className="disclosure-meta">{meta}</span>}</span>}>
      <div className={panelClassName}>{children}</div>
    </AccordionItem>
  </Accordion>;
}
