import type { ReactNode, Ref } from "react";
import { ScientificTaskPanel } from "@jorpago2/scientific-ui";

type InspectorPanelProps = {
  id: string;
  label: string;
  ariaLabel: string;
  hidden: boolean;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  panelRef?: Ref<HTMLElement>;
};

export function InspectorPanel({ id, label, ariaLabel, hidden, closeLabel, onClose, children, panelRef }: InspectorPanelProps) {
  return (
    <ScientificTaskPanel
      ref={panelRef}
      id={id}
      className="inspector sidebar"
      title={label}
      titleId={`${id}-title`}
      eyebrow="Inspector"
      onClose={onClose}
      closeLabel={closeLabel}
      bodyClassName="sidebar-content"
      aria-label={ariaLabel}
      aria-hidden={hidden}
      hidden={hidden}
      tabIndex={-1}
    >
      {children}
    </ScientificTaskPanel>
  );
}
