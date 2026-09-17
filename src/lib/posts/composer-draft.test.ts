import { describe, expect, it } from "vitest";
import { isUnsubmittedComposerDraft } from "./composer-draft";

describe("isUnsubmittedComposerDraft", () => {
  it("flags pending posts with empty or whitespace body", () => {
    expect(isUnsubmittedComposerDraft({ status: "pending", body: "" })).toBe(true);
    expect(isUnsubmittedComposerDraft({ status: "pending", body: "   \n" })).toBe(true);
  });

  it("keeps real submissions in the queue", () => {
    expect(
      isUnsubmittedComposerDraft({ status: "pending", body: "Hallo zusammen" }),
    ).toBe(false);
  });

  it("ignores approved, rejected and deleted rows", () => {
    expect(isUnsubmittedComposerDraft({ status: "approved", body: "" })).toBe(false);
    expect(isUnsubmittedComposerDraft({ status: "rejected", body: "" })).toBe(false);
    expect(isUnsubmittedComposerDraft({ status: "deleted", body: "" })).toBe(false);
  });
});
