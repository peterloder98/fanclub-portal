import { describe, expect, it } from "vitest";
import {
  appendSignatureToEmailHtml,
  EMAIL_PARAGRAPH_STYLE,
  EMAIL_SIGNATURE_GAP_HTML,
} from "./email-layout";

describe("email layout signature gap", () => {
  it("uses a single blank line before the signature", () => {
    const body = `<p style="${EMAIL_PARAGRAPH_STYLE}">Hallo Welt</p>`;
    const sig = '<p style="margin:0">Signatur</p>';
    const html = appendSignatureToEmailHtml(body, sig);
    expect(html).toContain(EMAIL_SIGNATURE_GAP_HTML);
    expect(html).not.toContain("&nbsp;</p>");
    expect(html).toMatch(/<p style="margin:0;font-size:15px;line-height:1\.55;color:#1e293b">Hallo Welt<\/p>/);
    expect(html.endsWith(`${EMAIL_SIGNATURE_GAP_HTML}${sig}`)).toBe(true);
  });
});
