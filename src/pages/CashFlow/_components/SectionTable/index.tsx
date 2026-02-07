import Row from "../Row";

type Props = {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  total: number;
  rightBorder?: boolean;
};

export default function SectionTable({ title, columns, rows, total, rightBorder = true }: Props) {
  const colCount = columns.length;
  return (
    <div className={rightBorder ? "border-r-2 border-neutral-700" : ""}>
      <div className="border-b-2 border-neutral-700 py-3 text-center font-semibold">{title}</div>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
        <Row cells={columns} variant="header" colCount={colCount} />
        {rows.map((cells, i) => (
          <Row key={i} cells={cells} variant="body" colCount={colCount} />
        ))}
        <Row cells={Array.from({ length: colCount }, (_, i) => (i === colCount - 1 ? total : ""))} variant="total" colCount={colCount} />
      </div>
    </div>
  );
}
