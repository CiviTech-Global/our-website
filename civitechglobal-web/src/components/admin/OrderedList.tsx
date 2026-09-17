import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** Up and down arrows for one row of a list ordered with useOrderedList. */
export function MoveButtons({
  index,
  count,
  busy,
  onMove,
  upLabel,
  downLabel,
}: {
  index: number;
  count: number;
  busy: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  upLabel: string;
  downLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Button
        size="sm"
        variant="ghost"
        aria-label={upLabel}
        disabled={index === 0 || busy}
        onClick={() => onMove(index, -1)}
      >
        <ArrowUp className="size-4" aria-hidden="true" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label={downLabel}
        disabled={index === count - 1 || busy}
        onClick={() => onMove(index, 1)}
      >
        <ArrowDown className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
