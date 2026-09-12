import { dayKey } from "@/lib/repo/stats";

/**
 * A year of writing, one cell per day.
 *
 * The rule this component exists to honour: a day she did not write is drawn
 * simply as a pale cell. Not red, not an X, not a gap in a chain. Her
 * previous blog ended because missing days became a reason to stop, and a
 * calendar that marks absence as failure is the same mechanism in visual form.
 */
export default function YearCalendar({ activity }: { activity: Map<string, number> }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start on the Sunday at or before "one year ago", so columns are clean weeks.
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());

  const cells: Array<{ key: string; level: number; label: string }> = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const k = dayKey(cursor.getTime());
    const n = activity.get(k) ?? 0;
    const level = n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : 3;
    cells.push({
      key: k,
      level,
      label: `${cursor.getMonth() + 1}月${cursor.getDate()}日 ${n > 0 ? `${n}本` : ""}`,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return (
    <div>
      <div className="year" role="img" aria-label="この一年の記録">
        {cells.map((c) => (
          <div
            key={c.key}
            className={`year__cell${c.level > 0 ? ` year__cell--${c.level}` : ""}`}
            title={c.label}
          />
        ))}
      </div>
      <div className="year__legend">
        <span className="label">この一年</span>
        <span style={{ flex: 1 }} />
        <div className="year__cell" />
        <div className="year__cell year__cell--1" />
        <div className="year__cell year__cell--2" />
        <div className="year__cell year__cell--3" />
      </div>
    </div>
  );
}
