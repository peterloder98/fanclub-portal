import { describe, expect, it } from "vitest";
import {
  BOARD_RUNDMAIL_MAX_FILES,
  BOARD_RUNDMAIL_MAX_TOTAL_BYTES,
  boardEmailHtmlToText,
  boardRundmailDeliveryError,
  boardRundmailFilesError,
  composeBoardRundmailMessage,
  inspectBoardRundmailFile,
  isBoardEmailBodyEmpty,
  normalizeBoardLinkUrl,
  sanitizeBoardEmailHtml,
} from "./board-rundmail-content";

describe("board rundmail content", () => {
  it("hides raw delivery errors from the board", () => {
    const message = boardRundmailDeliveryError(
      "outbound_test_mode_blocked:janine@example.com",
    );
    expect(message).not.toContain("@");
    expect(message).toMatch(/nicht freigegeben/);
    expect(boardRundmailDeliveryError("535 authentication failed")).toMatch(/Club-Postfach/);
  });

  it("keeps bold, italic and real links and strips scripts", () => {
    const html = sanitizeBoardEmailHtml(
      `<p onclick="alert(1)">Hallo <strong>du</strong> und <em>dich</em></p><a href="javascript:alert(1)">Klick</a><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="https://fanclub.anniperka.de/termine">Termine</a>`,
    );
    expect(html.toLowerCase()).not.toContain("script");
    expect(html.toLowerCase()).not.toContain("onclick");
    expect(html.toLowerCase()).not.toContain("onerror");
    expect(html.toLowerCase()).not.toContain("javascript");
    expect(html.toLowerCase()).not.toContain("<img");
    expect(html).toContain("<strong>du</strong>");
    expect(html).toContain("<em>dich</em>");
    expect(html).toContain('href="https://fanclub.anniperka.de/termine"');
    expect(html).toContain(">Termine</a>");
  });

  it("rejects encoded javascript links", () => {
    const html = sanitizeBoardEmailHtml(`<a href="javascript&#58;alert(1)">X</a>`);
    expect(html.toLowerCase()).not.toContain("javascript");
    expect(html).toContain("X");
  });

  it("turns the body into text with the link address", () => {
    const html = sanitizeBoardEmailHtml(`<p>Siehe <a href="https://fanclub.anniperka.de/termine">Termine</a></p>`);
    expect(boardEmailHtmlToText(html)).toContain("Termine (https://fanclub.anniperka.de/termine)");
  });

  it("personalizes the mail and keeps the link", () => {
    const raw = `<p>Hallo {{Vorname}}</p><p><a href="https://fanclub.anniperka.de/termine">Termine</a></p>`;
    const html = sanitizeBoardEmailHtml(raw);
    const result = composeBoardRundmailMessage({
      subject: "Hallo {{Vorname}}",
      html,
      text: boardEmailHtmlToText(html),
      firstName: "Max<b>",
      salutation: "Lieber Max<b>",
      signatureHtml: "<p>Der Fanclub</p>",
      signatureText: "Der Fanclub",
    });
    expect(result.subject).toBe("Hallo Max<b>");
    expect(result.html).toContain("Max&lt;b&gt;");
    expect(result.html).not.toContain("Max<b>");
    expect(result.html).toContain('href="https://fanclub.anniperka.de/termine"');
    expect(result.html).toContain("Der Fanclub");
    expect(result.text).toContain("Termine (https://fanclub.anniperka.de/termine)");
    expect(result.text).toContain("Der Fanclub");
  });

  it("treats an empty editor as empty and a greeting token as text", () => {
    expect(isBoardEmailBodyEmpty("<p><br></p>")).toBe(true);
    expect(isBoardEmailBodyEmpty("<div><br></div>")).toBe(true);
    expect(isBoardEmailBodyEmpty("<p>&nbsp;</p>")).toBe(true);
    expect(isBoardEmailBodyEmpty("<p>{{Vorname}}</p>")).toBe(false);
    expect(isBoardEmailBodyEmpty("   ")).toBe(true);
  });

  it("normalizes web addresses and blocks script urls", () => {
    expect(normalizeBoardLinkUrl("fanclub.anniperka.de/live")).toBe("https://fanclub.anniperka.de/live");
    expect(normalizeBoardLinkUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeBoardLinkUrl("mailto:vorstand@example.com")).toBe("mailto:vorstand@example.com");
  });

  it("caps attachments and checks the file contents", () => {
    const tooMany = Array.from({ length: BOARD_RUNDMAIL_MAX_FILES + 1 }, (_, index) => ({
      name: `info-${index}.pdf`,
      size: 20,
    }));
    expect(boardRundmailFilesError(tooMany)).toMatch(/5/);
    expect(boardRundmailFilesError([{ name: "bild.exe", size: 20 }])).toMatch(/nicht erlaubt/);
    expect(
      boardRundmailFilesError([{ name: "gross.pdf", size: BOARD_RUNDMAIL_MAX_TOTAL_BYTES + 1 }]),
    ).toMatch(/3 MB/);

    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    expect(inspectBoardRundmailFile("info.pdf", pdf)).toEqual({
      filename: "info.pdf",
      contentType: "application/pdf",
    });
    expect(inspectBoardRundmailFile("info.pdf", new TextEncoder().encode("<html></html>"))).toEqual({
      error: "„info.pdf“ wirkt nicht wie eine gültige Datei.",
    });
    const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    expect(inspectBoardRundmailFile("Einladung.docx", docx)).toMatchObject({
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  });
});
