import { ALPHABET, BASE } from "@/lib/constants";

export function base62Encode(num: number): string {
  if (!Number.isFinite(num) || num < 0) {
    throw new Error("Counter value must be a non-negative number");
  }

  if (num === 0) {
    return ALPHABET[0];
  }

  let current = Math.floor(num);
  const chars: string[] = [];
  while (current > 0) {
    const remainder = current % BASE;
    chars.push(ALPHABET[remainder]);
    current = Math.floor(current / BASE);
  }

  return chars.reverse().join("");
}
