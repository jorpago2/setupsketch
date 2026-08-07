import type { ReactNode } from "react";
import { Accordion, AccordionItem, Button, IconButton, Layer, Search } from "@carbon/react";
import { Close, Favorite, FavoriteFilled, TrashCan } from "@carbon/react/icons";
import type { ElementKind } from "./componentCatalog";

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
}: ComponentLibraryProps) {
  return (
    <aside id="component-library" className="library sidebar" aria-label="Component library" aria-hidden={!open}>
      <Layer withBackground className="sidebar-layer">
        <div className="panel-heading">
          <span>Library</span>
          <span className="panel-heading-actions">
            <Button size="sm" kind="danger--ghost" renderIcon={TrashCan} onClick={onClear}>Clear</Button>
            <IconButton size="sm" kind="ghost" align="bottom-end" label="Close component library" onClick={onClose}><Close size={16} aria-hidden={true} /></IconButton>
          </span>
        </div>
        <div className="sidebar-content">
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
            <h2 className="library-section-heading">Reusable modules</h2>
            {savedModules.map((module) => <div className="module-row" key={module.id}>
              <Button className="module-insert" size="sm" kind="ghost" onClick={() => onInsertModule(module.id)}>{module.name}</Button>
              <IconButton className="module-delete" size="sm" kind="ghost" label={`Delete ${module.name}`} onClick={() => onDeleteModule(module.id)}><TrashCan size={16} aria-hidden={true} /></IconButton>
            </div>)}
          </section> : null}
          <Accordion className="library-groups" align="end" isFlush size="sm">
          {groups.map((group) => {
            const expanded = searchIsActive || !collapsedGroups.includes(group.title);
            return (
              <AccordionItem className="library-group" key={`${group.title}:${searchIsActive}`} title={group.title} open={expanded} onHeadingClick={() => onToggleGroup(group.title)}>
                <div className="component-grid">
                  {group.items.map((item) => {
                    const favorite = favoriteKinds.includes(item.kind);
                    return <div className="component-card" key={`${group.title}-${item.kind}`}>
                      <button className="component-add" onClick={() => onAddElement(item.kind, item.label)}>
                        {renderPreview(item.kind)}
                        {item.label}
                      </button>
                      <IconButton className={favorite ? "favorite active" : "favorite"} size="sm" kind="ghost" label={`${favorite ? "Remove" : "Add"} ${item.label} ${favorite ? "from" : "to"} favorites`} onClick={() => onToggleFavorite(item.kind)}>
                        {favorite ? <FavoriteFilled size={16} aria-hidden={true} /> : <Favorite size={16} aria-hidden={true} />}
                      </IconButton>
                    </div>;
                  })}
                </div>
              </AccordionItem>
            );
          })}
          </Accordion>
          <p className="library-help">Add a component, drag it into place, then use Connect to draw signal paths.</p>
        </div>
      </Layer>
    </aside>
  );
}
