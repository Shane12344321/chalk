import { describe, expect, it } from "vitest";
import {
  AudioActivityDetector,
  REMOTE_AUDIO_ACTIVITY_CONFIGURATION,
} from "./remoteAudioActivity";

describe("remote audio activity detector", () => {
  it("uses separate start and stop hysteresis without claiming word position", () => {
    const detector = new AudioActivityDetector({
      activityThresholdRms: 0.01,
      activeFrames: 2,
      silentFrames: 3,
    });
    expect(detector.sample(0.02)).toBeUndefined();
    expect(detector.sample(0.03)).toBe(true);
    expect(detector.isActive()).toBe(true);
    expect(detector.sample(0.005)).toBeUndefined();
    expect(detector.sample(0)).toBeUndefined();
    expect(detector.sample(0.009)).toBe(false);
    expect(detector.isActive()).toBe(false);
  });

  it("resets consecutive-frame evidence and ignores invalid samples", () => {
    const detector = new AudioActivityDetector({ activeFrames: 2, silentFrames: 2 });
    expect(detector.sample(0.02)).toBeUndefined();
    expect(detector.sample(0)).toBeUndefined();
    expect(detector.sample(0.02)).toBeUndefined();
    expect(detector.sample(Number.NaN)).toBeUndefined();
    expect(detector.sample(0.02)).toBe(true);
    expect(detector.sample(-1)).toBeUndefined();
    expect(detector.sample(2)).toBeUndefined();
  });

  it("rejects thresholds and frame windows outside the fixed experiment budget", () => {
    expect(() => new AudioActivityDetector({ activityThresholdRms: 0 })).toThrow(/bounded/);
    expect(() => new AudioActivityDetector({ activeFrames: 0 })).toThrow(/frame count/);
    expect(() => new AudioActivityDetector({ silentFrames: 51 })).toThrow(/frame count/);
  });

  it("pins the production detector identity used by retained Phase-6 evidence", () => {
    expect(REMOTE_AUDIO_ACTIVITY_CONFIGURATION).toEqual({
      policyRevision: "rms-hysteresis-v1",
      activityThresholdRms: 0.012,
      activeFrames: 2,
      silentFrames: 5,
      fftSize: 1_024,
      falsePauseMinMs: 80,
    });
  });
});
