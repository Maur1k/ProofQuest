import { GenerationFailure, withDeadline } from "./boundary.server";
import { AI_LIMITS, boundedJson } from "./provider.server";

// Redis TIME and one atomic script prevent parallel hosts from overspending the allowance.
export const RESERVE_SCRIPT = `
local now = tonumber(redis.call('TIME')[1])
local day = math.floor(now / 86400)
local status = redis.call('HGET', KEYS[1], 'status')
if status then
  if redis.call('HGET', KEYS[1], 'fingerprint') ~= ARGV[1] then return {'conflict'} end
  if status == 'complete' then return {'complete', redis.call('HGET', KEYS[1], 'result')} end
  if status == 'pending' and now - tonumber(redis.call('HGET', KEYS[1], 'started')) < 60 then return {'pending'} end
  return {'failed'}
end
local function count(key)
  if tonumber(redis.call('HGET', key, 'day')) == day then return tonumber(redis.call('HGET', key, 'count')) or 0 end
  return 0
end
local guest = count(KEYS[2])
local total = count(KEYS[3])
if guest >= tonumber(ARGV[2]) or total >= tonumber(ARGV[3]) or redis.call('EXISTS', KEYS[4]) == 1 then return {'limited'} end
redis.call('HSET', KEYS[2], 'day', day, 'count', guest + 1)
redis.call('HSET', KEYS[3], 'day', day, 'count', total + 1)
redis.call('EXPIRE', KEYS[2], 172800)
redis.call('EXPIRE', KEYS[3], 172800)
redis.call('SET', KEYS[4], '1', 'EX', ARGV[4])
redis.call('HSET', KEYS[1], 'status', 'pending', 'fingerprint', ARGV[1], 'started', now)
redis.call('EXPIRE', KEYS[1], ARGV[5])
return {'reserved'}
`;
export const FINISH_SCRIPT = `
local status = redis.call('HGET', KEYS[1], 'status')
if status == 'complete' then return 1 end
if status ~= 'pending' then return 0 end
if ARGV[1] == 'complete' then redis.call('HSET', KEYS[1], 'status', 'complete', 'result', ARGV[2])
else redis.call('HSET', KEYS[1], 'status', 'failed') end
return 1
`;
export type JobReservation =
  | { status: "reserved" | "pending" | "failed" | "limited" | "conflict" }
  | { status: "complete"; result: unknown };
export interface StudyLedger {
  reserve(job: string, guest: string, fingerprint: string): Promise<JobReservation>;
  complete(job: string, result: unknown): Promise<void>;
  fail(job: string): Promise<void>;
}
export class UpstashLedger implements StudyLedger {
  constructor(
    private url: string,
    private token: string,
    private prefix = "proofquest:{generation}:v1",
    private fetcher: typeof fetch = fetch,
    private globalDaily: number = AI_LIMITS.globalDaily,
  ) {
    if (![20, 50].includes(globalDaily)) throw new GenerationFailure("unavailable");
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname.endsWith(".upstash.io") ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/"
    )
      throw new GenerationFailure("unavailable");
  }
  private async command(command: (string | number)[]) {
    return withDeadline(
      async (signal) => {
        const response = await this.fetcher(this.url, {
          method: "POST",
          signal,
          redirect: "error",
          headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
          body: JSON.stringify(command),
        });
        if (!response.ok) {
          void response.body?.cancel().catch(() => {});
          throw new GenerationFailure("unavailable");
        }
        const body = (await boundedJson(response, signal, 150000)) as {
          result?: unknown;
          error?: unknown;
        };
        if (!body || body.error || body.result === undefined)
          throw new GenerationFailure("unavailable");
        return body.result;
      },
      { deadlineMs: 5000 },
    );
  }
  async reserve(job: string, guest: string, fingerprint: string): Promise<JobReservation> {
    const result = await this.command([
      "EVAL",
      RESERVE_SCRIPT,
      4,
      `${this.prefix}:job:${job}`,
      `${this.prefix}:guest:${guest}`,
      `${this.prefix}:global`,
      `${this.prefix}:pace`,
      fingerprint,
      AI_LIMITS.guestDaily,
      this.globalDaily,
      AI_LIMITS.cooldownSeconds,
      AI_LIMITS.resultSeconds,
    ]);
    if (!Array.isArray(result)) throw new GenerationFailure("unavailable");
    const status: unknown = result[0];
    if (status === "complete" && typeof result[1] === "string") {
      try {
        return { status, result: JSON.parse(result[1]) as unknown };
      } catch {
        throw new GenerationFailure("unavailable");
      }
    }
    if (
      status === "reserved" ||
      status === "pending" ||
      status === "failed" ||
      status === "limited" ||
      status === "conflict"
    )
      return { status };
    throw new GenerationFailure("unavailable");
  }
  async complete(job: string, result: unknown) {
    if (
      (await this.command([
        "EVAL",
        FINISH_SCRIPT,
        1,
        `${this.prefix}:job:${job}`,
        "complete",
        JSON.stringify(result),
      ])) !== 1
    )
      throw new GenerationFailure("unavailable");
  }
  async fail(job: string) {
    await this.command(["EVAL", FINISH_SCRIPT, 1, `${this.prefix}:job:${job}`, "failed", ""]);
  }
}
