function isDecimal(value: unknown): value is { toNumber: () => number } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    typeof (value as Record<string, unknown>).toNumber === "function"
  );
}

export function serialize<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (isDecimal(data)) return data.toNumber() as unknown as T;
  if (data instanceof Date) return data as T;
  if (Array.isArray(data)) return data.map((item) => serialize(item)) as unknown as T;
  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = serialize(value);
    }
    return result as unknown as T;
  }
  return data;
}
