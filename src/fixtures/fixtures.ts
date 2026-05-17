import type { ReplayFixture } from "../evaluator/types";
import mediumSubmission from "./medium-submission.fixture.json";
import strongHarness from "./strong-harness.fixture.json";
import weakSubmission from "./weak-submission.fixture.json";

export const replayFixtures = [
  strongHarness,
  mediumSubmission,
  weakSubmission,
] as ReplayFixture[];

export const getFixtureById = (id: string) =>
  replayFixtures.find((fixture) => fixture.meta.id === id) ?? replayFixtures[0];
