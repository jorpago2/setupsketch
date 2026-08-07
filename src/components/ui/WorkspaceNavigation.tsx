import { Button } from "@carbon/react";
import { Chemistry, Grid as GridIcon, Inspection, Layers } from "@carbon/react/icons";

type WorkspaceNavigationProps = {
  libraryOpen: boolean;
  activeInspector: string | null;
  onToggleLibrary: () => void;
  onToggleInspector: (mode: "document" | "experiment" | "review") => void;
};

export function WorkspaceNavigation({
  libraryOpen,
  activeInspector,
  onToggleLibrary,
  onToggleInspector,
}: WorkspaceNavigationProps) {
  const navOptions = [
    { id: "library", active: libraryOpen, controls: "component-library", onClick: onToggleLibrary, label: "Components", icon: GridIcon },
    { id: "document", active: activeInspector === "document", controls: "document-inspector", onClick: () => onToggleInspector("document"), label: "Canvas", icon: Layers },
    { id: "experiment", active: activeInspector === "experiment", controls: "document-inspector", onClick: () => onToggleInspector("experiment"), label: "Experiment", icon: Chemistry },
    { id: "review", active: activeInspector === "review", controls: "document-inspector", onClick: () => onToggleInspector("review"), label: "Review", icon: Inspection },
  ];

  return (
    <nav className="workspace-switcher" aria-label="Workspace panels">
      {navOptions.map((option) => (
        <Button
          key={option.id}
          size="sm"
          kind="ghost"
          id={`${option.id}-toggle`}
          aria-controls={option.controls}
          aria-expanded={option.active}
          aria-current={option.active ? "page" : undefined}
          className={option.active ? "active" : ""}
          onClick={option.onClick}
        >
          <option.icon size={16} aria-hidden={true} />
          <span>{option.label}</span>
        </Button>
      ))}
    </nav>
  );
}
