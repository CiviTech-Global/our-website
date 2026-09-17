import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge, taught the application type scale.
 *
 * Out of the box it cannot tell `text-body` (a size) from `text-app-text` (a
 * colour) — both look like `text-<word>` — so it treats them as the same group
 * and silently drops whichever came first. A heading asking for a size and a
 * colour would lose one of them, and nothing would say so.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: ['caption', 'label', 'body', 'body-lg', 'title-sm', 'title', 'page', 'metric'],
        },
      ],
    },
  },
});

/** Merge Tailwind class lists, resolving conflicts (last one wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
