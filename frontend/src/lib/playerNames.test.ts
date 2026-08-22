import { describe, expect, it } from "vitest";
import { formatPlayerName, getPlayerInitials } from "./playerNames";

describe("formatPlayerName", () => {
  it.each([
    ["", ""],
    ["edo", "edo"],
    ["edo sangkan", "edo sangkan"],
    ["edo hebat hugut", "edo hebat H."],
    ["edo bagas sehat walafiat", "edo bagas S.W."],
    ["  Edo   Bagas   sehat   walafiat  ", "Edo Bagas S.W."],
  ])("formats %j as %j", (name, expected) => {
    expect(formatPlayerName(name)).toBe(expected);
  });
});

describe("getPlayerInitials", () => {
  it.each([
    ["", "?"],
    ["edo", "E"],
    ["edo sangkan", "ES"],
    ["edo hebat hugut", "EH"],
    ["Mas fid", "MF"],
  ])("formats %j as %j", (name, expected) => {
    expect(getPlayerInitials(name)).toBe(expected);
  });
});
