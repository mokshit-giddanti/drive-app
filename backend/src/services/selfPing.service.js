const BACKEND_URL = "https://backend-fn8n.onrender.com";
const INTERVAL_MS = 50 * 1000; // 50 seconds
const TIMEOUT_MS = 20 * 1000; // 20 seconds

let intervalId = null;

const pingSelf = async () => {
  const startedAt = new Date();

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const response = await fetch(`${BACKEND_URL}/?selfPing=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();

    console.log(
      `[SELF-PING] ${startedAt.toISOString()} | OK | HTTP ${
        response.status
      } | ${text.slice(0, 100)}`
    );
  } catch (error) {
    console.error(
      `[SELF-PING] ${startedAt.toISOString()} | FAILED | ${error.message}`
    );
  } finally {
    clearTimeout(timeout);
  }
};

const startSelfPing = () => {
  if (intervalId) {
    console.log("[SELF-PING] Already running");
    return;
  }

  console.log("[SELF-PING] Started");
  console.log(`[SELF-PING] URL: ${BACKEND_URL}`);
  console.log(`[SELF-PING] Interval: ${INTERVAL_MS / 1000} seconds`);

  pingSelf();

  intervalId = setInterval(() => {
    pingSelf();
  }, INTERVAL_MS);
};

module.exports = {
  startSelfPing,
};