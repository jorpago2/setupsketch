import type { ConnectionType, ElementKind } from "./componentCatalog";

export type SetupTemplate = {
  id: string;
  title: string;
  elements: Array<{ id: string; kind: ElementKind; label: string; x: number; y: number; rotation?: number }>;
  connections: Array<{ from: string; to: string; type: ConnectionType }>;
};

export const setupTemplates: SetupTemplate[] = [
  {
    id: "mach-zehnder",
    title: "Mach–Zehnder interferometer",
    elements: [
      { id: "laser", kind: "laser", label: "Laser", x: 140, y: 350 },
      { id: "bs1", kind: "beamsplitter", label: "BS1", x: 350, y: 350 },
      { id: "m1", kind: "mirror", label: "M1", x: 570, y: 220, rotation: 90 },
      { id: "m2", kind: "mirror", label: "M2", x: 570, y: 480, rotation: 0 },
      { id: "bs2", kind: "beamsplitter", label: "BS2", x: 790, y: 350 },
      { id: "pd1", kind: "detector", label: "PD1", x: 1010, y: 260 },
      { id: "pd2", kind: "detector", label: "PD2", x: 1010, y: 440 },
    ],
    connections: [
      { from: "laser", to: "bs1", type: "beam" }, { from: "bs1", to: "m1", type: "beam" },
      { from: "bs1", to: "m2", type: "beam" }, { from: "m1", to: "bs2", type: "beam" },
      { from: "m2", to: "bs2", type: "beam" }, { from: "bs2", to: "pd1", type: "beam" },
      { from: "bs2", to: "pd2", type: "beam" },
    ],
  },
  {
    id: "pump-probe",
    title: "Pump–probe experiment",
    elements: [
      { id: "laser", kind: "laser", label: "Ultrafast laser", x: 130, y: 340 },
      { id: "bs", kind: "beamsplitter", label: "Beam splitter", x: 330, y: 340 },
      { id: "delay", kind: "translationstage", label: "Delay line", x: 540, y: 210 },
      { id: "pump", kind: "waveplate", label: "Pump control", x: 730, y: 210 },
      { id: "probe", kind: "waveplate", label: "Probe control", x: 540, y: 470 },
      { id: "sample", kind: "sample", label: "Sample", x: 790, y: 340 },
      { id: "detector", kind: "detector", label: "Detector", x: 1030, y: 340 },
    ],
    connections: [
      { from: "laser", to: "bs", type: "beam" }, { from: "bs", to: "delay", type: "beam" },
      { from: "delay", to: "pump", type: "beam" }, { from: "pump", to: "sample", type: "beam" },
      { from: "bs", to: "probe", type: "beam" }, { from: "probe", to: "sample", type: "beam" },
      { from: "sample", to: "detector", type: "beam" },
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
      { from: "laser", to: "lens", type: "beam" }, { from: "lens", to: "sample", type: "beam" },
      { from: "sample", to: "iris", type: "beam" }, { from: "iris", to: "detector", type: "beam" },
    ],
  },
  {
    id: "ring-cavity",
    title: "Ring cavity",
    elements: [
      { id: "laser", kind: "laser", label: "Laser", x: 140, y: 350 },
      { id: "input", kind: "beamsplitter", label: "Input coupler", x: 350, y: 350 },
      { id: "m1", kind: "curvedmirror", label: "M1", x: 580, y: 200, rotation: 90 },
      { id: "sample", kind: "sample", label: "Intracavity sample", x: 800, y: 350 },
      { id: "m2", kind: "curvedmirror", label: "M2", x: 580, y: 500, rotation: 90 },
      { id: "detector", kind: "detector", label: "Transmission", x: 1030, y: 350 },
    ],
    connections: [
      { from: "laser", to: "input", type: "beam" }, { from: "input", to: "m1", type: "beam" },
      { from: "m1", to: "sample", type: "beam" }, { from: "sample", to: "m2", type: "beam" },
      { from: "m2", to: "input", type: "beam" }, { from: "sample", to: "detector", type: "beam" },
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
      { id: "source", kind: "source", label: "Reference", x: 350, y: 500 },
      { id: "mixer", kind: "mixer", label: "Lock-in", x: 810, y: 500 },
      { id: "daq", kind: "daq", label: "DAQ", x: 1030, y: 500 },
    ],
    connections: [
      { from: "laser", to: "aom", type: "beam" }, { from: "aom", to: "sample", type: "beam" },
      { from: "sample", to: "pd", type: "beam" }, { from: "source", to: "aom", type: "signal" },
      { from: "source", to: "mixer", type: "signal" }, { from: "pd", to: "mixer", type: "signal" },
      { from: "mixer", to: "daq", type: "signal" },
    ],
  },
  {
    id: "vna-chain",
    title: "VNA measurement chain",
    elements: [
      { id: "vna", kind: "networkanalyzer", label: "VNA", x: 130, y: 350 },
      { id: "amp", kind: "amplifier", label: "RF amplifier", x: 350, y: 350 },
      { id: "coupler", kind: "directionalcoupler", label: "Directional coupler", x: 570, y: 350 },
      { id: "dut", kind: "sample", label: "DUT", x: 790, y: 350 },
      { id: "attenuator", kind: "attenuator", label: "Attenuator", x: 1000, y: 350 },
      { id: "meter", kind: "rfpowermeter", label: "Power meter", x: 570, y: 550 },
    ],
    connections: [
      { from: "vna", to: "amp", type: "signal" }, { from: "amp", to: "coupler", type: "signal" },
      { from: "coupler", to: "dut", type: "signal" }, { from: "dut", to: "attenuator", type: "signal" },
      { from: "coupler", to: "meter", type: "signal" }, { from: "attenuator", to: "vna", type: "signal" },
    ],
  },
];
