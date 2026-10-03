// Leaflet divIcons take an HTML string, not React, so these mirror the lucide
// icons used elsewhere in the UI as standalone markup.
const SVG = (body, { size = 16, fill = 'none' } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`

export const MARKER_GLYPHS = {
  power: SVG('<polygon points="13 2 4 14 11 14 10 22 19 10 12 10 13 2" />'),
  water: SVG('<path d="M12 21a6 6 0 0 1-6-6c0-4 6-11 6-11s6 7 6 11a6 6 0 0 1-6 6z" />'),
  fuel: SVG(
    '<path d="M5 21V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v16" /><path d="M3 21h12" /><path d="M7 9h4" /><path d="M16 10l2 2v5a2 2 0 0 0 4 0V9l-3-3" />',
  ),
  official: SVG(
    '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z" /><path d="M17 8a5 5 0 0 1 0 8" />',
    { size: 17 },
  ),
}
