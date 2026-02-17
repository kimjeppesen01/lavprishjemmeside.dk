/**
 * Build srcset for image URLs that support width parameters (e.g. Unsplash).
 * Returns undefined for URLs that don't support it.
 */
export function buildSrcset(url: string, widths = [400, 800, 1200]): string | undefined {
  if (!url) return undefined;
  if (url.includes('unsplash.com')) {
    const base = url.replace(/([?&])w=\d+/g, '$1').replace(/[?&]$/, '') || url.split('?')[0];
    const hasParams = base.includes('?');
    return widths.map((w) => `${base}${hasParams ? '&' : '?'}w=${w} ${w}w`).join(', ');
  }
  return undefined;
}
