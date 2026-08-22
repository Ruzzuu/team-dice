function nameParts(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
}

function firstCharacter(value: string): string {
  return Array.from(value)[0] ?? "";
}

export function formatPlayerName(name: string): string {
  const parts = nameParts(name);
  if (parts.length <= 2) return parts.join(" ");
  const abbreviated = parts
    .slice(2)
    .map((part) => `${firstCharacter(part).toUpperCase()}.`)
    .join("");
  return `${parts.slice(0, 2).join(" ")} ${abbreviated}`;
}

export function getPlayerInitials(name: string): string {
  const initials = nameParts(name)
    .slice(0, 2)
    .map(firstCharacter)
    .join("")
    .toUpperCase();
  return initials || "?";
}
