const STUB = "data:text/javascript,export%20%7B%7D";

/** No-op `server-only` saat worker PM2 jalan di luar Next.js. */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: STUB, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
