import { describe, expect, it } from "vitest";
import { mapVideoProcessingError } from "./process-video-server";

describe("mapVideoProcessingError", () => {
  it("maps corrupt uploads", () => {
    expect(mapVideoProcessingError("moov atom not found")).toMatch(/beschädigt|unvollständig/i);
  });

  it("maps missing video stream", () => {
    expect(mapVideoProcessingError("Die Datei enthält kein Video")).toMatch(/kein Video/i);
  });

  it("maps encoder failures", () => {
    expect(mapVideoProcessingError("Could not open encoder before EOF")).toMatch(/konvertiert/i);
  });

  it("keeps size errors", () => {
    expect(mapVideoProcessingError("Video ist auch nach Komprimierung zu groß")).toMatch(/zu groß/i);
  });
});
