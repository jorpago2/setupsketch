export type ConnectionType = "beam" | "signal";

const BLUE = "#2263d4";
const PURPLE = "#7253cf";
const GREEN = "#16846b";
const DARK = "#303844";

export const componentGroups = [
  {
    title: "Optics & photonics",
    items: [
      { kind: "laser", label: "Laser", layer: "optics", color: "#e84d3c", ports: "lr" },
      { kind: "mirror", label: "Mirror", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "curvedmirror", label: "Curved mirror", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "beamsplitter", label: "Beam splitter", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "lens", label: "Lens", layer: "optics", color: BLUE, ports: "lr" },
      { kind: "waveplate", label: "Wave plate", layer: "optics", color: BLUE, ports: "lr" },
      { kind: "dichroic", label: "Dichroic mirror", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "grating", label: "Diffraction grating", layer: "optics", color: BLUE, ports: "cross" },
      { kind: "beamdump", label: "Beam dump", layer: "optics", color: BLUE, ports: "input" },
      { kind: "crystal", label: "Nonlinear crystal", layer: "optics", color: PURPLE, ports: "lr" },
      { kind: "sample", label: "Sample", layer: "optics", color: PURPLE, ports: "lr" },
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
      { kind: "aom", label: "AOM", layer: "optics", color: PURPLE, ports: "lr" },
      { kind: "eom", label: "EOM", layer: "optics", color: PURPLE, ports: "lr" },
      { kind: "isolator", label: "Optical isolator", layer: "optics", color: BLUE, ports: "lr" },
      { kind: "cavity", label: "Ring cavity", layer: "optics", color: PURPLE, ports: "cross" },
      { kind: "detector", label: "Detector", layer: "optics", color: GREEN, ports: "lr" },
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
      { kind: "biastee", label: "Bias tee", layer: "electronics", color: DARK, ports: "lrt" },
      { kind: "rfswitch", label: "RF switch", layer: "electronics", color: DARK, ports: "lrr" },
      { kind: "bandpass", label: "Band-pass filter", layer: "electronics", color: DARK, ports: "lr" },
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
      { kind: "oscilloscope", label: "Oscilloscope", layer: "electronics", color: DARK, ports: "input" },
      { kind: "spectrum", label: "Spectrum analyzer", layer: "electronics", color: DARK, ports: "input" },
      { kind: "networkanalyzer", label: "Vector network analyzer", layer: "electronics", color: DARK, ports: "quad" },
      { kind: "waveformgenerator", label: "Waveform generator", layer: "electronics", color: DARK, ports: "output" },
      { kind: "dmm", label: "Digital multimeter", layer: "electronics", color: DARK, ports: "input" },
      { kind: "powersupply", label: "DC power supply", layer: "electronics", color: DARK, ports: "output" },
      { kind: "smu", label: "Source measure unit", layer: "electronics", color: DARK, ports: "quad" },
      { kind: "electronicload", label: "Electronic load", layer: "electronics", color: DARK, ports: "input" },
      { kind: "lcrmeter", label: "LCR meter", layer: "electronics", color: DARK, ports: "quad" },
      { kind: "rfpowermeter", label: "RF power meter", layer: "electronics", color: DARK, ports: "input" },
      { kind: "daq", label: "DAQ", layer: "electronics", color: DARK, ports: "input" },
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
] as const;

export type ElementKind = (typeof componentGroups)[number]["items"][number]["kind"];
export type PortLayout = (typeof componentGroups)[number]["items"][number]["ports"];
export type ComponentDefinition = {
  readonly kind: ElementKind;
  readonly label: string;
  readonly layer: "optics" | "electronics";
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
export const defaultColor = (kind: ElementKind) => componentByKind.get(kind)?.color ?? DARK;
