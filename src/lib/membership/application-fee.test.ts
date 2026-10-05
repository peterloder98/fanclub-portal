import { describe, expect, it } from "vitest";
import {
  applicationFeeCentsForCountry,
  formatApplicationFeeEurLabel,
  isDomesticMembershipCountry,
} from "./application-fee";

describe("applicationFeeCentsForCountry", () => {
  it("charges 15 € for Germany", () => {
    expect(applicationFeeCentsForCountry("DE")).toBe(1500);
    expect(applicationFeeCentsForCountry("Deutschland")).toBe(1500);
    expect(applicationFeeCentsForCountry("germany")).toBe(1500);
  });

  it("charges 20 € for every non-DE country including EU", () => {
    expect(applicationFeeCentsForCountry("AT")).toBe(2000);
    expect(applicationFeeCentsForCountry("CH")).toBe(2000);
    expect(applicationFeeCentsForCountry("NL")).toBe(2000);
    expect(applicationFeeCentsForCountry("FR")).toBe(2000);
    expect(applicationFeeCentsForCountry("US")).toBe(2000);
  });

  it("treats missing country as abroad (safer for Neuantrag)", () => {
    expect(applicationFeeCentsForCountry("")).toBe(2000);
    expect(applicationFeeCentsForCountry(null)).toBe(2000);
  });

  it("formats labels and domestic check", () => {
    expect(formatApplicationFeeEurLabel(1500)).toBe("15,00 €");
    expect(formatApplicationFeeEurLabel(2000)).toBe("20,00 €");
    expect(isDomesticMembershipCountry("DE")).toBe(true);
    expect(isDomesticMembershipCountry("AT")).toBe(false);
  });
});
