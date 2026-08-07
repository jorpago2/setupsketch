import type { ReactNode } from "react";
import { Button, IconButton, Layer, Search } from "@carbon/react";
import { Close, TrashCan } from "@carbon/react/icons";
import type { ElementKind } from "../componentCatalog";

type LibraryGroup = {
  title: string;
  items: Array<{ kind: ElementKind; label: string }>;
};

type SavedModuleSummary = { id: string; name: string };

type ComponentLibraryProps = {
  open: boolean;
  groups: LibraryGroup[];
  savedModules: SavedModuleSummary[];
  query: string;
  searchIsActive: boolean;
  collapsedGroups: string[];
  favoriteKinds: ElementKind[];
  onClose: () => void;
  onClear: () => void;
  onQueryChange: (value: string) => void;
  onInsertModule: (id: string) => void;
  onDeleteModule: (id: string) => void;
  onToggleGroup: (title: string) => void;
  onAddElement: (kind: ElementKind, label: string) => void;
  onToggleFavorite: (kind: ElementKind) => void;
  renderPreview: (kind: ElementKind) => ReactNode;
  renderDeleteIcon: () => ReactNode;
};

export function ComponentLibrary({
  open,
  groups,
  savedModules,
  query,
  searchIsActive,
  collapsedGroups,
  favoriteKinds,
  onClose,
  onClear,
  onQueryChange,
  onInsertModule,
  onDeleteModule,
  onToggleGroup,
  onAddElement,
  onToggleFavorite,
  renderPreview,
  renderDeleteIcon,
}: ComponentLibraryProps) {
  return (
    <aside id="component-library" className="library sidebar" aria-label="Component library" aria-hidden={!open}>
      <Layer withBackground className="sidebar-layer">
        <div className="panel-heading">
          <span>Library</span>
          <span className="panel-heading-actions">
            <Button size="sm" kind="danger--ghost" renderIcon={TrashCan} onClick={onClear}>Clear</Button>
            <IconButton size="sm" kind="ghost" label="Close component library" onClick={onClose}><Close size={16} aria-hidden={true} /></IconButton>
          </span>
        </div>
        <Search
          className="library-search"
          id="component-search"
          size="sm"
          labelText="Search components"
          closeButtonLabelText="Clear component search"
          placeholder="Search components"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onClear={() => onQueryChange("")}
        />
        {savedModules.length ? <section className="library-group saved-modules">
          <div className="library-group-title"><span>Reusable modules</span></div>
          {savedModules.map((module) => <div className="module-row" key={module.id}>
            <button onClick={() => onInsertModule(module.id)}>{module.name}</button>
            <button className="danger" aria-label={`Delete ${module.name}`} title={`Delete ${module.name}`} onClick={() => onDeleteModule(module.id)}>{renderDeleteIcon()}</button>
          </div>)}
        </section> : null}
        {groups.map((group) => {
          const expanded = searchIsActive || !collapsedGroups.includes(group.title);
          return (
            <section className="library-group" key={group.title}>
              <button className="library-group-title" onClick={() => onToggleGroup(group.title)} aria-expanded={expanded}>
                {group.title}<span>{expanded ? "−" : "+"}</span>
              </button>
              {expanded && <div className="component-grid">
                {group.items.map((item) => {
                  const favorite = favoriteKinds.includes(item.kind);
                  return <div className="component-card" key={`${group.title}-${item.kind}`}>
                    <button className="component-add" onClick={() => onAddElement(item.kind, item.label)}>
                      {renderPreview(item.kind)}
                      {item.label}
                    </button>
                    <button className={favorite ? "favorite active" : "favorite"} onClick={() => onToggleFavorite(item.kind)} aria-label={`${favorite ? "Remove" : "Add"} ${item.label} ${favorite ? "from" : "to"} favorites`} title="Favorite">★</button>
                  </div>;
                })}
              </div>}
            </section>
          );
        })}
        <p className="library-help">Add a component, drag it into place, then use Connect to draw signal paths.</p>
      </Layer>
    </aside>
  );
}
