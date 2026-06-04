import { describe, expect, it } from "vitest";
import {
  deltaAfterCommentDelete,
  deltaAfterCommentInsert,
} from "./post-comment-client";

describe("post-comment-client", () => {
  it("awards delta when points appear after insert", () => {
    expect(
      deltaAfterCommentInsert(null, { id: "1", points: 3, created_at: "2026-01-01T00:00:00Z" }),
    ).toBe(3);
  });

  it("does not award twice on same txn", () => {
    const txn = { id: "1", points: 3, created_at: "2026-01-01T00:00:00Z" };
    expect(deltaAfterCommentInsert(txn, txn)).toBe(0);
  });

  it("revokes when txn gone after delete", () => {
    const before = { id: "1", points: 2, created_at: "2026-01-01T00:00:00Z" };
    expect(deltaAfterCommentDelete(before, null)).toBe(-2);
  });
});
