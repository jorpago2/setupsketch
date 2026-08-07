import type { ReactNode } from "react";
import { IconButton, Layer } from "@carbon/react";
import { Close } from "@carbon/react/icons";

type InspectorPanelProps = {
  id: string;
  label: string;
  ariaLabel: string;
  hidden: boolean;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
};

export function InspectorPanel({ id, label, ariaLabel, hidden, closeLabel, onClose, children }: InspectorPanelProps) {
  return (
    <aside id={id} className="inspector sidebar" aria-label={ariaLabel} aria-hidden={hidden}>
      <Layer withBackground className="sidebar-layer">
        <div className="panel-heading">
          <span>{label}</span>
          <IconButton size="sm" kind="ghost" label={closeLabel} onClick={onClose}><Close size={16} aria-hidden={true} /></IconButton>
        </div>
        {children}
      </Layer>
    </aside>
  );
}
