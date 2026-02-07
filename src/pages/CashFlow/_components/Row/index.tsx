import Cell from "../Cell";

type Variant = "header" | "body" | "total";

export default function Row({ cells, variant, colCount }: { cells: (string | number)[]; variant: Variant; colCount: number }) {
  const height = variant === "header" ? "min-h-12" : variant === "total" ? "min-h-16" : "min-h-12";

  return (
    <>
      {Array.from({ length: colCount }).map((_, i) => (
        <Cell key={i} value={cells[i] ?? ""} variant={variant} isLastCol={i === colCount - 1} heightClass={height} />
      ))}
    </>
  );
}
