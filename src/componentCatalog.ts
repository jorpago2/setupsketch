export type ConnectionType = "beam" | "signal";
export type PortType = "optical-free-space" | "fiber" | "rf" | "dc" | "trigger" | "digital";

const BLUE = "#0072b2";
const PURPLE = "#cc79a7";
const GREEN = "#009e73";
const DARK = "#30343b";

export const componentGroups = [
  {
    title: "Optics & photonics",
    items: [
      { kind: "laser", label: "Laser", layer: "optics", color: "#d55e00", ports: "lr" },
      { kind: "mirror", label: "Mirror", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "curvedmirror", label: "Curved mirror", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "beamsplitter", label: "Beam splitter", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "lens", label: "Lens", layer: "optics", color: BLUE, ports: "lr" },
      { kind: "waveplate", label: "Wave plate", layer: "optics", color: BLUE, ports: "lr" },
      { kind: "polarizer", label: "Linear polarizer", layer: "optics", color: BLUE, ports: "lr" },
      { kind: "pbs", label: "Polarizing beam splitter", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "ndfilter", label: "Neutral-density filter", layer: "optics", color: BLUE, ports: "lr" },
      { kind: "dichroic", label: "Dichroic mirror", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "grating", label: "Diffraction grating", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "beamdump", label: "Beam dump", layer: "optics", color: BLUE, ports: "input" },
      { kind: "crystal", label: "Nonlinear crystal", layer: "optics", color: PURPLE, ports: "lr" },
      { kind: "sample", label: "Sample", layer: "optics", color: PURPLE, ports: "cross" },
      { kind: "fiber", label: "Optical fiber", layer: "optics", color: BLUE, ports: "lr" },
      { kind: "fibercoupler", label: "Fiber coupler", layer: "optics", color: BLUE, ports: "quad" },
      { kind: "prism", label: "Prism", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "objective", label: "Microscope objective", layer: "optics", color: BLUE, ports: "lr" },
      { kind: "shutter", label: "Optical shutter", layer: "optics", color: BLUE, ports: "lr" },
    ],
  },
  {
    title: "Modulation & compound",
    items: [
      { kind: "aom", label: "AOM", layer: "optics", color: PURPLE, ports: "lrt" },
      { kind: "eom", label: "EOM", layer: "optics", color: PURPLE, ports: "lrt" },
      { kind: "faradayrotator", label: "Faraday rotator", layer: "optics", color: PURPLE, ports: "lr" },
      { kind: "mzm", label: "Mach-Zehnder modulator", layer: "optics", color: PURPLE, ports: "lrt" },
      { kind: "isolator", label: "Optical isolator", layer: "optics", color: BLUE, ports: "lr" },
      { kind: "cavity", label: "Ring cavity", layer: "optics", color: PURPLE, ports: "cross" },
      { kind: "detector", label: "Detector", layer: "optics", color: GREEN, ports: "lr" },
    ],
  },
  {
    title: "Fiber & integrated photonics",
    items: [
      { kind: "opticalcirculator", label: "Optical circulator", layer: "optics", color: BLUE, ports: "lrb" },
      { kind: "wdm", label: "WDM coupler", layer: "optics", color: BLUE, ports: "lrr" },
      { kind: "fbg", label: "Fiber Bragg grating", layer: "optics", color: BLUE, ports: "lr" },
      { kind: "edfa", label: "EDFA", layer: "optics", color: GREEN, ports: "lr" },
      { kind: "ringresonator", label: "Ring resonator", layer: "optics", color: PURPLE, ports: "lr" },
      { kind: "opticalswitch", label: "Optical switch", layer: "optics", color: BLUE, ports: "lrr" },
      { kind: "gratingcoupler", label: "Grating coupler", layer: "optics", color: PURPLE, ports: "lt" },
    ],
  },
  {
    title: "Lab hardware",
    items: [
      { kind: "kinematicmount", label: "Kinematic mount", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "translationstage", label: "Translation stage", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "rotationmount", label: "Rotation mount", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "fibercollimator", label: "Fiber collimator", layer: "optics", color: BLUE, ports: "lr" },
      { kind: "cagecube", label: "Cage cube", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "iris", label: "Iris diaphragm", layer: "optics", color: BLUE, ports: "lr" },
      { kind: "breadboard", label: "Optical breadboard", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "postholder", label: "Post & holder", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "flipmount", label: "Flip mount", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "motorizedstage", label: "Motorized stage", layer: "optics", color: BLUE, ports: "cross" },
    ],
  },
  {
    title: "RF & microwave",
    items: [
      { kind: "attenuator", label: "Attenuator", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "splitter", label: "Power splitter", layer: "electronics", color: DARK, ports: "lrr" },
      { kind: "directionalcoupler", label: "Directional coupler", layer: "electronics", color: DARK, ports: "quad" },
      { kind: "circulator", label: "RF circulator", layer: "electronics", color: DARK, ports: "lrb" },
      { kind: "rfisolator", label: "RF isolator", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "diplexer", label: "Diplexer", layer: "electronics", color: DARK, ports: "lrr" },
      { kind: "biastee", label: "Bias tee", layer: "electronics", color: DARK, ports: "lrt" },
      { kind: "rfswitch", label: "RF switch", layer: "electronics", color: DARK, ports: "lrr" },
      { kind: "bandpass", label: "Band-pass filter", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "bandstop", label: "Band-stop filter", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "delayline", label: "RF delay line", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "lna", label: "Low-noise amplifier", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "poweramplifier", label: "Power amplifier", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "iqmixer", label: "I/Q mixer", layer: "electronics", color: DARK, ports: "cross" },
      { kind: "vco", label: "VCO", layer: "electronics", color: DARK, ports: "output" },
      { kind: "termination", label: "50 Ω termination", layer: "electronics", color: DARK, ports: "input" },
      { kind: "balun", label: "Balun", layer: "electronics", color: DARK, ports: "lrr" },
      { kind: "dcblock", label: "DC block", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "rftransformer", label: "RF transformer", layer: "electronics", color: DARK, ports: "quad" },
      { kind: "phaseshifter", label: "Phase shifter", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "frequencymultiplier", label: "Frequency multiplier", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "limiter", label: "RF limiter", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "rfdetector", label: "RF detector", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "hybridcoupler", label: "90° hybrid", layer: "electronics", color: DARK, ports: "quad" },
    ],
  },
  {
    title: "Test instruments",
    items: [
      { kind: "oscilloscope", label: "Oscilloscope", layer: "electronics", color: DARK, ports: "instrument" },
      { kind: "spectrum", label: "Spectrum analyzer", layer: "electronics", color: DARK, ports: "instrument" },
      { kind: "networkanalyzer", label: "Vector network analyzer", layer: "electronics", color: DARK, ports: "instrument" },
      { kind: "waveformgenerator", label: "Waveform generator", layer: "electronics", color: DARK, ports: "instrument" },
      { kind: "dmm", label: "Digital multimeter", layer: "electronics", color: DARK, ports: "input" },
      { kind: "powersupply", label: "DC power supply", layer: "electronics", color: DARK, ports: "output" },
      { kind: "smu", label: "Source measure unit", layer: "electronics", color: DARK, ports: "quad" },
      { kind: "electronicload", label: "Electronic load", layer: "electronics", color: DARK, ports: "input" },
      { kind: "lcrmeter", label: "LCR meter", layer: "electronics", color: DARK, ports: "quad" },
      { kind: "rfpowermeter", label: "RF power meter", layer: "electronics", color: DARK, ports: "input" },
      { kind: "camera", label: "Scientific camera", layer: "electronics", color: DARK, ports: "input" },
      { kind: "opticalspectrumanalyzer", label: "Optical spectrum analyzer", layer: "electronics", color: DARK, ports: "input" },
      { kind: "opticalpowermeter", label: "Optical power meter", layer: "electronics", color: DARK, ports: "input" },
      { kind: "daq", label: "DAQ", layer: "electronics", color: DARK, ports: "instrument" },
    ],
  },
  {
    title: "Electronics",
    items: [
      { kind: "source", label: "Source", layer: "electronics", color: DARK, ports: "output" },
      { kind: "amplifier", label: "Amplifier", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "hvamplifier", label: "HV amplifier", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "photodiode", label: "Photodiode", layer: "electronics", color: GREEN, ports: "lr" },
      { kind: "qpd", label: "Quadrant detector", layer: "electronics", color: GREEN, ports: "lr" },
      { kind: "mixer", label: "Mixer", layer: "electronics", color: DARK, ports: "cross" },
      { kind: "lowpass", label: "Low-pass filter", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "highpass", label: "High-pass filter", layer: "electronics", color: DARK, ports: "lr" },
      { kind: "servo", label: "Servo controller", layer: "electronics", color: DARK, ports: "lr" },
    ],
  },
  {
    title: "Annotations",
    items: [
      { kind: "textnote", label: "Text note", layer: "annotations", color: DARK, ports: "lr" },
      { kind: "equation", label: "Equation", layer: "annotations", color: DARK, ports: "lr" },
      { kind: "region", label: "Region", layer: "annotations", color: BLUE, ports: "lr" },
      { kind: "dimension", label: "Dimension", layer: "annotations", color: DARK, ports: "lr" },
      { kind: "brace", label: "Brace", layer: "annotations", color: DARK, ports: "lr" },
      { kind: "legend", label: "Legend", layer: "annotations", color: DARK, ports: "lr" },
    ],
  },
] as const;

export type ElementKind = (typeof componentGroups)[number]["items"][number]["kind"];
export type PortLayout = (typeof componentGroups)[number]["items"][number]["ports"];
export const componentPortLayouts: Record<PortLayout, Array<{ id: string; x: number; y: number }>> = {
  lr: [{ id: "left", x: -58, y: 0 }, { id: "right", x: 58, y: 0 }],
  cross: [
    { id: "left", x: -58, y: 0 }, { id: "right", x: 58, y: 0 },
    { id: "top", x: 0, y: -58 }, { id: "bottom", x: 0, y: 58 },
  ],
  quad: [
    { id: "left-top", x: -58, y: -20 }, { id: "left-bottom", x: -58, y: 20 },
    { id: "right-top", x: 58, y: -20 }, { id: "right-bottom", x: 58, y: 20 },
  ],
  lrr: [
    { id: "left", x: -58, y: 0 },
    { id: "right-top", x: 58, y: -22 }, { id: "right-bottom", x: 58, y: 22 },
  ],
  lrt: [
    { id: "left", x: -58, y: 0 }, { id: "right", x: 58, y: 0 }, { id: "top", x: 0, y: -58 },
  ],
  lrb: [
    { id: "left", x: -58, y: 0 }, { id: "right", x: 58, y: 0 }, { id: "bottom", x: 0, y: 58 },
  ],
  lt: [{ id: "left", x: -58, y: 0 }, { id: "top", x: 0, y: -58 }],
  input: [{ id: "input", x: -58, y: 0 }],
  output: [{ id: "output", x: 58, y: 0 }],
  instrument: [
    { id: "input", x: -58, y: 0 }, { id: "output", x: 58, y: 0 },
    { id: "trigger", x: 0, y: -58 }, { id: "digital", x: 0, y: 58 },
  ],
};
export type ComponentDefinition = {
  readonly kind: ElementKind;
  readonly label: string;
  readonly layer: "optics" | "electronics" | "annotations";
  readonly color: string;
  readonly ports: PortLayout;
};

export const componentDefinitions: ComponentDefinition[] = componentGroups.reduce<ComponentDefinition[]>(
  (items, group) => [...items, ...(group.items as readonly ComponentDefinition[])],
  [],
);
export const componentByKind = new Map<ElementKind, ComponentDefinition>(
  componentDefinitions.map((component) => [component.kind, component] as const),
);
export const elementKinds = new Set<ElementKind>(componentDefinitions.map((component) => component.kind));
export const electronicKinds = new Set<ElementKind>(
  componentDefinitions.filter((component) => component.layer === "electronics").map((component) => component.kind),
);
export const annotationKinds = new Set<ElementKind>(
  componentDefinitions.filter((component) => component.layer === "annotations").map((component) => component.kind),
);
export const mechanicalKinds = new Set<ElementKind>(["kinematicmount", "translationstage", "rotationmount", "breadboard", "postholder", "flipmount"]);
export const defaultColor = (kind: ElementKind) => componentByKind.get(kind)?.color ?? DARK;

export const portTypeLabels: Record<PortType, string> = {
  "optical-free-space": "Free-space optical",
  fiber: "Optical fiber",
  rf: "RF / analog",
  dc: "DC",
  trigger: "Trigger / sync",
  digital: "Digital data",
};

export const portTypeColors: Record<PortType, string> = {
  "optical-free-space": "#d55e00",
  fiber: "#0072b2",
  rf: "#30343b",
  dc: "#e69f00",
  trigger: "#cc79a7",
  digital: "#009e73",
};

const fiberKinds = new Set<ElementKind>(["fiber", "fibercoupler", "opticalcirculator", "wdm", "fbg", "edfa", "ringresonator", "opticalswitch"]);
const dcKinds = new Set<ElementKind>(["dmm", "powersupply", "smu", "electronicload", "lcrmeter"]);
const digitalKinds = new Set<ElementKind>(["servo", "motorizedstage"]);
const instrumentKinds = new Set<ElementKind>(["oscilloscope", "spectrum", "networkanalyzer", "waveformgenerator", "daq"]);

export const portTypeFor = (kind: ElementKind, portId: string): PortType => {
  if (portId === "trigger" || portId === "top" && (kind === "aom" || kind === "eom")) return portId === "top" ? "rf" : "trigger";
  if (portId === "digital") return "digital";
  if (kind === "laser") return portId === "left" ? "dc" : "optical-free-space";
  if (kind === "detector" || kind === "photodiode" || kind === "qpd") return portId === "left" ? "optical-free-space" : "rf";
  if (kind === "fibercollimator") return portId === "left" ? "fiber" : "optical-free-space";
  if (kind === "mzm") return portId === "top" ? "rf" : "fiber";
  if (kind === "gratingcoupler") return portId === "top" ? "optical-free-space" : "fiber";
  if (kind === "opticalspectrumanalyzer") return "fiber";
  if (kind === "camera" || kind === "opticalpowermeter") return "optical-free-space";
  if (kind === "biastee" && portId === "top") return "dc";
  if (fiberKinds.has(kind)) return "fiber";
  if (dcKinds.has(kind)) return "dc";
  if (digitalKinds.has(kind)) return "digital";
  if (instrumentKinds.has(kind)) return portId === "output" && kind !== "waveformgenerator" && kind !== "networkanalyzer" ? "digital" : "rf";
  const layer = componentByKind.get(kind)?.layer;
  return layer === "optics" ? "optical-free-space" : layer === "electronics" ? "rf" : "digital";
};
