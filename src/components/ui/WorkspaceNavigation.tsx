import { Chemistry, Grid as GridIcon, Inspection, Layers } from "@carbon/react/icons";
import { ScientificToolRail } from "@jorpago2/scientific-ui";

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
    { id: "library", controls: "component-library", label: "Components", icon: GridIcon },
    { id: "document", controls: "document-inspector", label: "Canvas", icon: Layers },
    { id: "experiment", controls: "document-inspector", label: "Experiment", icon: Chemistry },
    { id: "review", controls: "document-inspector", label: "Review", icon: Inspection },
  ];
  const activeId = activeInspector && activeInspector !== "selection" ? activeInspector : libraryOpen ? "library" : null;

  return (
    <ScientificToolRail
      className="workspace-switcher"
      label="Workspace panels"
      activeId={activeId ?? "library"}
      expandedId={activeId}
      onChange={(id) => {
        if (id === null) {
          if (activeId === "library") onToggleLibrary();
          else if (activeId) onToggleInspector(activeId as "document" | "experiment" | "review");
          return;
        }
        if (id === "library") {
          if (activeInspector && activeInspector !== "selection") onToggleInspector(activeInspector as "document" | "experiment" | "review");
          if (!libraryOpen) onToggleLibrary();
          return;
        }
        if (libraryOpen) onToggleLibrary();
        onToggleInspector(id as "document" | "experiment" | "review");
      }}
      items={navOptions.map(({ id, controls, label, icon: Icon }) => ({
        id,
        triggerId: `${id}-toggle`,
        controlsId: controls,
        label,
        icon: <Icon size={20} />,
      }))}
    />
  );
}
