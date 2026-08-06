import type { ElementKind, PortType } from "./componentCatalog";

export type SetupTemplate = {
  id: string;
  title: string;
  elements: Array<{ id: string; kind: ElementKind; label: string; x: number; y: number; rotation?: number }>;
  connections: Array<{
    from: string;
    to: string;
    portType: PortType;
    fromPort: string;
    toPort: string;
    routing?: "straight" | "orthogonal";
    waypoints?: Array<{ x: number; y: number }>;
  }>;
};

export const setupTemplates: SetupTemplate[] = [
  {
    id: "mach-zehnder",
    title: "Mach–Zehnder interferometer",
    elements: [
      { id: "laser", kind: "laser", label: "Laser", x: 140, y: 450 },
      { id: "bs1", kind: "beamsplitter", label: "BS1", x: 350, y: 450 },
      { id: "m1", kind: "mirror", label: "M1", x: 350, y: 200 },
      { id: "m2", kind: "mirror", label: "M2", x: 790, y: 450 },
      { id: "bs2", kind: "beamsplitter", label: "BS2", x: 790, y: 200 },
      { id: "pd1", kind: "detector", label: "PD1", x: 1010, y: 200 },
      { id: "pd2", kind: "detector", label: "PD2", x: 790, y: 60, rotation: -90 },
    ],
    connections: [
      { from: "laser", to: "bs1", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "bs1", to: "m1", portType: "optical-free-space", fromPort: "top", toPort: "bottom" },
      { from: "bs1", to: "m2", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "m1", to: "bs2", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "m2", to: "bs2", portType: "optical-free-space", fromPort: "top", toPort: "bottom" },
      { from: "bs2", to: "pd1", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "bs2", to: "pd2", portType: "optical-free-space", fromPort: "top", toPort: "left" },
    ],
  },
  {
    id: "pump-probe",
    title: "Pump–probe experiment",
    elements: [
      { id: "laser", kind: "laser", label: "Ultrafast laser", x: 130, y: 340 },
      { id: "bs", kind: "beamsplitter", label: "Beam splitter", x: 330, y: 340 },
      { id: "delay", kind: "mirror", label: "Delay mirror", x: 540, y: 210, rotation: 28 },
      { id: "delay-stage", kind: "translationstage", label: "Delay stage", x: 540, y: 100 },
      { id: "pump", kind: "waveplate", label: "Pump control", x: 730, y: 210 },
      { id: "probe", kind: "waveplate", label: "Probe control", x: 540, y: 470 },
      { id: "sample", kind: "sample", label: "Sample", x: 790, y: 340 },
      { id: "detector", kind: "detector", label: "Detector", x: 1030, y: 340 },
    ],
    connections: [
      { from: "laser", to: "bs", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "bs", to: "delay", portType: "optical-free-space", fromPort: "top", toPort: "left" },
      { from: "delay", to: "pump", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "pump", to: "sample", portType: "optical-free-space", fromPort: "right", toPort: "top" },
      { from: "bs", to: "probe", portType: "optical-free-space", fromPort: "bottom", toPort: "left" },
      { from: "probe", to: "sample", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "sample", to: "detector", portType: "optical-free-space", fromPort: "right", toPort: "left" },
    ],
  },
  {
    id: "z-scan",
    title: "Z-scan characterization",
    elements: [
      { id: "laser", kind: "laser", label: "Laser", x: 150, y: 350 },
      { id: "lens", kind: "lens", label: "Focusing lens", x: 390, y: 350 },
      { id: "stage", kind: "translationstage", label: "Z stage", x: 620, y: 470 },
      { id: "sample", kind: "sample", label: "Sample", x: 620, y: 350 },
      { id: "iris", kind: "iris", label: "Aperture", x: 840, y: 350 },
      { id: "detector", kind: "detector", label: "Detector", x: 1030, y: 350 },
    ],
    connections: [
      { from: "laser", to: "lens", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "lens", to: "sample", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "sample", to: "iris", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "iris", to: "detector", portType: "optical-free-space", fromPort: "right", toPort: "left" },
    ],
  },
  {
    id: "ring-cavity",
    title: "Ring cavity",
    elements: [
      { id: "laser", kind: "laser", label: "Laser", x: 140, y: 480 },
      { id: "input", kind: "beamsplitter", label: "Input coupler", x: 350, y: 480 },
      { id: "m1", kind: "curvedmirror", label: "M1", x: 620, y: 180, rotation: 90 },
      { id: "sample", kind: "sample", label: "Intracavity sample", x: 760, y: 330, rotation: 47 },
      { id: "m2", kind: "curvedmirror", label: "M2", x: 900, y: 480, rotation: -157 },
      { id: "detector", kind: "detector", label: "Transmission", x: 350, y: 600, rotation: 90 },
    ],
    connections: [
      { from: "laser", to: "input", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "input", to: "m1", portType: "optical-free-space", fromPort: "top", toPort: "bottom" },
      { from: "m1", to: "sample", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "sample", to: "m2", portType: "optical-free-space", fromPort: "right", toPort: "top" },
      { from: "m2", to: "input", portType: "optical-free-space", fromPort: "left", toPort: "right" },
      { from: "input", to: "detector", portType: "optical-free-space", fromPort: "bottom", toPort: "left" },
    ],
  },
  {
    id: "lock-in",
    title: "Lock-in detection chain",
    elements: [
      { id: "laser", kind: "laser", label: "Laser", x: 140, y: 250 },
      { id: "aom", kind: "aom", label: "Modulator", x: 350, y: 250 },
      { id: "sample", kind: "sample", label: "Sample", x: 580, y: 250 },
      { id: "pd", kind: "photodiode", label: "Photodiode", x: 810, y: 250 },
      { id: "source", kind: "source", label: "Reference", x: 372, y: 620, rotation: -90 },
      { id: "splitter", kind: "splitter", label: "RF splitter", x: 372, y: 480, rotation: -90 },
      { id: "mixer", kind: "mixer", label: "Lock-in", x: 810, y: 500 },
      { id: "daq", kind: "daq", label: "DAQ", x: 1030, y: 500 },
    ],
    connections: [
      { from: "laser", to: "aom", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "aom", to: "sample", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "sample", to: "pd", portType: "optical-free-space", fromPort: "right", toPort: "left" },
      { from: "source", to: "splitter", portType: "rf", fromPort: "output", toPort: "left", routing: "straight" },
      { from: "splitter", to: "aom", portType: "rf", fromPort: "right-top", toPort: "top", routing: "straight" },
      { from: "splitter", to: "mixer", portType: "rf", fromPort: "right-bottom", toPort: "left", routing: "orthogonal", waypoints: [{ x: 650, y: 500 }] },
      { from: "pd", to: "mixer", portType: "rf", fromPort: "right", toPort: "top", routing: "orthogonal", waypoints: [{ x: 868, y: 400 }] },
      { from: "mixer", to: "daq", portType: "rf", fromPort: "right", toPort: "input", routing: "straight" },
    ],
  },
  {
    id: "vna-chain",
    title: "VNA measurement chain",
    elements: [
      { id: "vna", kind: "networkanalyzer", label: "VNA", x: 130, y: 350 },
      { id: "amp", kind: "amplifier", label: "RF amplifier", x: 350, y: 350 },
      { id: "coupler", kind: "directionalcoupler", label: "Directional coupler", x: 570, y: 350 },
      { id: "dut", kind: "bandpass", label: "RF DUT", x: 790, y: 350 },
      { id: "attenuator", kind: "attenuator", label: "Attenuator", x: 1000, y: 350 },
      { id: "meter", kind: "rfpowermeter", label: "Power meter", x: 760, y: 550 },
      { id: "termination", kind: "termination", label: "50 Ω", x: 470, y: 550 },
    ],
    connections: [
      { from: "vna", to: "amp", portType: "rf", fromPort: "output", toPort: "left" },
      { from: "amp", to: "coupler", portType: "rf", fromPort: "right", toPort: "left-top" },
      { from: "coupler", to: "dut", portType: "rf", fromPort: "right-top", toPort: "left" },
      { from: "dut", to: "attenuator", portType: "rf", fromPort: "right", toPort: "left" },
      { from: "coupler", to: "meter", portType: "rf", fromPort: "right-bottom", toPort: "input", routing: "orthogonal", waypoints: [{ x: 680, y: 550 }] },
      { from: "coupler", to: "termination", portType: "rf", fromPort: "left-bottom", toPort: "input", routing: "orthogonal", waypoints: [{ x: 410, y: 550 }] },
      { from: "attenuator", to: "vna", portType: "rf", fromPort: "right", toPort: "input", routing: "orthogonal", waypoints: [{ x: 1100, y: 120 }, { x: 70, y: 120 }] },
    ],
  },
];
