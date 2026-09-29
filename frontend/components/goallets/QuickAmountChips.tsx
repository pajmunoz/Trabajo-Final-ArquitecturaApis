"use client";

const MONTOS = [50, 100, 200, 500];

export function QuickAmountChips({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (monto: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MONTOS.map((monto) => (
        <button
          key={monto}
          type="button"
          onClick={() => onSelect(monto)}
          className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
            selected === monto
              ? "border-primary bg-primary-container text-on-primary-container"
              : "border-outline bg-surface-container-lowest text-on-surface hover:border-primary"
          }`}
        >
          ${monto}
        </button>
      ))}
    </div>
  );
}
