import { createElement, Fragment, type ElementType } from 'react';
import { cn } from '@/lib/utils';

/**
 * A headline whose words rise into place one after another.
 *
 * Persian is joined script: animating it letter by letter splits the shaped
 * glyphs apart, and no CSS puts them back. So the unit here is the word —
 * split on spaces only, which keeps a half-space (ZWNJ) inside its word and
 * every word shaped whole. Screen readers get the sentence once, from the
 * label; the moving spans are hidden from them. Reduced motion shows the line
 * at rest (index.css).
 */
export function KineticWords({
  text,
  as = 'h1',
  className,
}: {
  text: string;
  as?: ElementType;
  className?: string;
}) {
  const words = text.split(/ +/).filter(Boolean);
  return createElement(
    as,
    { className: cn('bagh-words', className), 'aria-label': text },
    // The space sits between the spans, not inside them: trailing white
    // space inside an inline-block is trimmed, which glued the words together.
    words.map((word, index) => (
      <Fragment key={`${word}-${index}`}>
        {index > 0 && ' '}
        <span aria-hidden="true" style={{ '--i': index } as React.CSSProperties}>
          {word}
        </span>
      </Fragment>
    ))
  );
}
