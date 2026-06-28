/** A run of W / D / L pills (oldest → newest), FlashScore-style. */
const STYLE: Record<string, string> = {
  W: "bg-success text-white",
  D: "bg-amber-500 text-white",
  L: "bg-destructive text-white",
};

export function FormStrip({ form, size = "sm" }: { form: string; size?: "sm" | "md" }) {
  const box = size === "md" ? "w-5 h-5 text-[11px]" : "w-4 h-4 text-[9px]";
  return (
    <div className="flex gap-0.5">
      {form.split("").map((r, i) => (
        <span key={i} className={`inline-flex items-center justify-center rounded ${box} font-bold ${STYLE[r] ?? "bg-muted text-muted-foreground"}`}>
          {r}
        </span>
      ))}
    </div>
  );
}
