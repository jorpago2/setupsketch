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
  return (
    <nav className="workspace-switcher" aria-label="Workspace panels">
      <Button size="sm" kind="ghost" id="library-toggle" className={libraryOpen ? "active" : ""} aria-controls="component-library" aria-expanded={libraryOpen} onClick={onToggleLibrary}>
        <GridIcon size={16} aria-hidden={true} />
        <span>Components</span>
      </Button>
      <Button size="sm" kind="ghost" id="document-toggle" className={activeInspector === "document" ? "active" : ""} aria-controls="document-inspector" aria-expanded={activeInspector === "document"} onClick={() => onToggleInspector("document")}>
        <Layers size={16} aria-hidden={true} />
        <span>Canvas</span>
      </Button>
      <Button size="sm" kind="ghost" id="experiment-toggle" className={activeInspector === "experiment" ? "active" : ""} aria-controls="document-inspector" aria-expanded={activeInspector === "experiment"} onClick={() => onToggleInspector("experiment")}>
        <Chemistry size={16} aria-hidden={true} />
        <span>Experiment</span>
      </Button>
      <Button size="sm" kind="ghost" id="review-toggle" className={activeInspector === "review" ? "active" : ""} aria-controls="document-inspector" aria-expanded={activeInspector === "review"} onClick={() => onToggleInspector("review")}>
        <Inspection size={16} aria-hidden={true} />
        <span>Review</span>
      </Button>
    </nav>
  );
}
