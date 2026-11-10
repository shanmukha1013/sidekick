import type { Map as LeafletMap } from "leaflet";

/**
 * Leaflet 1.9 schedules `_onZoomTransitionEnd` 250 ms after a zoom animation starts. If the map is removed
 * in that window (navigating away mid-zoom), the callback touches panes that no longer exist and throws
 * "Cannot read properties of undefined (reading '_leaflet_pos')". Clearing the in-progress flag when the
 * map unloads makes that callback return early.
 */
export function guardZoomOnUnload(map: LeafletMap) {
  map.once("unload", () => {
    (map as unknown as { _animatingZoom?: boolean })._animatingZoom = false;
  });
}
