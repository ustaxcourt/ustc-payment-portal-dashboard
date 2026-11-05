export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.info(`[dashboard] Node.js runtime ${process.version}`);
  }
}
