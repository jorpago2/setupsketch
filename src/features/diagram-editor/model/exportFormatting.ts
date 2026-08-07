export const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
export const optionalNumber = (value: string) => {
  if (value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};
export const escapeLatex = (value: string) => value.replace(/([\\{}%$#&_])/g, "\\$1").replaceAll("~", "\\textasciitilde{}").replaceAll("^", "\\textasciicircum{}");
export const formatBandwidth = (value?: number) => {
  if (!value) return "—";
  const units = [[1e9, "GHz"], [1e6, "MHz"], [1e3, "kHz"]] as const;
  const unit = units.find(([scale]) => value >= scale);
  return unit ? `${(value / unit[0]).toPrecision(3)} ${unit[1]}` : `${value.toPrecision(3)} Hz`;
};
export const svgDataUri = (source: string) => {
  const bytes = new TextEncoder().encode(source);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return `data:image/svg+xml;base64,${btoa(binary)}`;
};
