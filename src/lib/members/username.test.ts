import { describe, expect, it } from "vitest";
import { slugifyMemberUsername } from "./username";

describe("slugifyMemberUsername", () => {
  it("transliterates German umlauts to ae/oe/ue/ss", () => {
    expect(slugifyMemberUsername("Hans-Jörg", "Bäcker")).toBe("hans.joerg.baecker");
    expect(slugifyMemberUsername("Sabine", "Müller")).toBe("sabine.mueller");
    expect(slugifyMemberUsername("Franz", "Groß")).toBe("franz.gross");
  });

  it("avoids empty segments and lone dots", () => {
    expect(slugifyMemberUsername("Ä", "Ö")).toBe("ae.oe");
    expect(slugifyMemberUsername("", "")).toBe("member");
  });
});
