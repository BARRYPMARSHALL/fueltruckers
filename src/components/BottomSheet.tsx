// ─── Bottom sheet (draggable station list over the map) ───────────────────
import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useUi } from '@/stores/uiStore';

export function BottomSheet({ children }: { children: ReactNode }) {
  const open = useUi((s) => s.sheetOpen);
  const setOpen = useUi((s) => s.setSheetOpen);
  const selectedStationId = useUi((s) => s.selectedStationId);
  const selectStation = useUi((s) => s.selectStation);
  const [dragging, setDragging] = useState(false);

  // When a station is selected on the map, snap the sheet open to the list.
  const effectiveOpen = open || !!selectedStationId;

  const toggle = () => {
    setOpen(!open);
    if (selectedStationId) selectStation(null);
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ${effectiveOpen && !dragging ? 'translate-y-0' : 'translate-y-[calc(100%-3rem)]'}`}
      onMouseDown={() => setDragging(true)}
      onMouseUp={() => setDragging(false)}
    >
      {/* handle */}
      <button
        onClick={toggle}
        className="mx-auto flex w-full items-center justify-center py-2.5 pt-safe"
        aria-label={effectiveOpen ? 'Collapse station list' : 'Expand station list'}
      >
        <span className="sheet-handle" />
        <span className="ml-2 text-slate-400">
          {effectiveOpen ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronUp className="h-4 w-4" aria-hidden />}
        </span>
      </button>
      <div className="max-h-[70vh] overflow-y-auto rounded-t-3xl bg-navy-light/95 backdrop-blur-xl border-t border-white/10 pb-safe">
        {children}
      </div>
    </div>
  );
}
