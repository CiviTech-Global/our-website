/** Names joined in the reader's language: "A، B" or "A, B". */
export function namesText(names: string[], locale: string): string {
  return names.join(locale === 'fa' ? '، ' : ', ');
}
