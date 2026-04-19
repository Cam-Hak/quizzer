import { mockInvoke } from "./mock";

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return mockInvoke(cmd, args) as T;
}
