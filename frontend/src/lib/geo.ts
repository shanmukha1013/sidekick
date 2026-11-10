import type { Job } from "@/lib/types";

/** Bounding box as sent to the API: [minLng, minLat, maxLng, maxLat]. */
export type BBox = [number, number, number, number];

/** True when a job has real, in-range coordinates (jobs without them are listed but not pinned). */
export const hasCoords = (j: Pick<Job, "lat" | "lng">) =>
  typeof j.lat === "number" &&
  typeof j.lng === "number" &&
  Number.isFinite(j.lat) &&
  Number.isFinite(j.lng) &&
  Math.abs(j.lat) <= 90 &&
  Math.abs(j.lng) <= 180;
