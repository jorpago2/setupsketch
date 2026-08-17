
# SetupSketch project guidance

## Arquitectura y propiedad

- React es el único propietario de la estructura, visibilidad, atributos ARIA, estado visual y eventos de la interfaz.
- El modelo de dominio vive en `src/features/diagram-editor/model/`: sus funciones de movimiento, rutas, validación, presupuestos, persistencia y formateo deben ser puras y no depender del DOM.
- `DiagramEditor.tsx` coordina el estado y traduce entre `DiagramElement`/`Connection` y los nodos/aristas de `@xyflow/react`. React Flow es la capa de edición y presentación, no la fuente de verdad científica.
- `DiagramCanvas.tsx` y las aristas personalizadas pueden usar la API de React Flow, pero no deben duplicar el modelo ni guardar estado de negocio que no pueda persistirse en el snapshot.

## Presupuestos y validez científica

- Conserva las unidades y supuestos explícitos de `calculateBudgets`: ganancia/pérdida en dB, rutas por dominio, Friis para RF y densidad térmica `kT` a la temperatura indicada.
- Respeta los límites de cálculo (`MAX_INCLUDED_BUDGETS` y `MAX_COUNTED_BUDGETS`). Si el resultado está truncado, conserva `truncated`, `totalIsExact` y la evidencia visible; no lo presentes como exhaustivo.
- `validateSetup` debe seguir siendo una validación del modelo, no un efecto colateral de la vista. Mantén separados errores científicos/estructurales, advertencias y decisiones puramente visuales.
- Al cambiar puertos, conexiones, rutas o componentes, comprueba tipos de puerto, ciclos, elementos sin conectar, calibración, ancho de banda, ruido y terminaciones antes de ajustar CSS o React Flow.

## React Flow, canvas y exportaciones

- El estado React/modelo controla nodos, aristas, selección, viewport, waypoints, grid y visibilidad. No mezcles listeners imperativos y handlers React sobre el mismo control.
- Mantén la geometría de conexiones y el routing ortogonal en el modelo; la arista de React Flow solo debe representar ese resultado y seguir siendo accesible e interactiva.
- SVG, PNG, PDF, TikZ, netlist, BOM CSV y PowerPoint deben derivarse del snapshot/modelo actual, usar nombres de archivo seguros y escapar correctamente texto, CSV y LaTeX. No exportes datos obsoletos del estado anterior.
- Para exportaciones rasterizadas o de publicación, comprueba tamaño, escala, recorte, capas, etiquetas y legibilidad. Para importación BOM CSV, conserva la validación de columnas, valores numéricos y mensajes de error.
- Los accesos imperativos a `canvas`, descarga de blobs, impresión y captura del frame son fronteras de exportación controladas por React; no conviertas esas operaciones en una segunda fuente de estado.

## Carbon y `scientific-ui`

- Usa la versión instalada de `@carbon/react` cuando encaje, pero Carbon no garantiza por sí solo una composición clara, jerarquía correcta o buen responsive. Consulta documentación o Storybook solo al introducir un componente, resolver una duda o sobrescribir estilos internos.
- Respeta tokens, accesibilidad, foco, teclado, estados de carga/error/vacío y comportamiento responsive. Evalúa la interfaz renderizada, incluida la edición React Flow y sus paneles, no solo el JSX.
- Corrige por defecto los problemas específicos de SetupSketch. Modifica `@jorpago2/scientific-ui` únicamente si la causa pertenece realmente al componente compartido y la corrección debe propagarse.
- Si se actualiza la dependencia vendorizada, cambia conjuntamente `package.json`, `pnpm-lock.yaml` y `vendor/jorpago2-scientific-ui-*.tgz`, y comprueba que el tarball nuevo queda rastreado por Git.

## Camino rápido y colaboración

- Atiende una familia concreta de problemas por iteración. Inspecciona la implementación relevante y un flujo representativo; amplía el alcance solo si el riesgo o el resultado lo justifican.
- Usa subagentes `gpt-5.6-luna` con razonamiento `max` en paralelo solo para partes independientes donde mejoren claramente velocidad, cobertura o calidad. Asigna archivos y objetivos sin solapamiento; el agente principal integra, revisa el diff y verifica el estado final.
- No uses subagentes para cambios pequeños o fuertemente acoplados, ni permitas ediciones simultáneas del mismo archivo.

## Verificación

- Para cambios visuales o de interacción, usa `$browser:control-in-app-browser` cuando esté disponible, inspecciona la pantalla renderizada y reutiliza el servidor local y HMR durante la iteración. No declares resuelto un problema visual solo por compilación o inspección estática.
- Cambio visual localizado: navegador interno y resolución afectada. Cambio responsive: escritorio y un viewport representativo del breakpoint. Cambio de modelo, React Flow o exportación: ejecuta el flujo afectado y las comprobaciones correspondientes.
- Usa únicamente los scripts reales del proyecto: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:ui`, `pnpm build`, `pnpm dev` y `pnpm preview`.
- `pnpm test` construye la aplicación y ejecuta las pruebas de modelo/app; `pnpm test:ui` ejecuta los flujos de navegador. Reserva `pnpm build` para la integración final o antes de publicar, y no ejecutes una matriz completa para un ajuste localizado.
- Mantén separadas la validez de presupuestos/modelo y la calidad visual salvo que el cambio afecte a ambas. Informa solo de comprobaciones realmente ejecutadas.
