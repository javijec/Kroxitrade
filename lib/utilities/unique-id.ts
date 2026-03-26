const RADIX = 36;

export const uniqueId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(RADIX).substring(2) + Date.now().toString(RADIX);
};
