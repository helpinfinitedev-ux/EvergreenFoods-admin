type Variant = "header" | "body" | "total";

export default function Cell({ value, variant, isLastCol, heightClass }: { value: string | number; variant: Variant; isLastCol: boolean; heightClass: string }) {
  const base = "border-b-2 border-neutral-700 px-3";
  const side = isLastCol ? "" : "border-r-2 border-neutral-700";
  const align = isLastCol ? "text-right" : "text-left";
  const padY = variant === "header" ? "py-2" : "py-4";
  const font = variant === "header" ? "font-semibold" : "font-medium";
  const bg = variant === "header" ? "bg-white" : "bg-white";

  return <div className={`${base} ${side} ${bg} ${heightClass} ${padY} ${font} ${align} text-wrap`}>{value}</div>;
}
