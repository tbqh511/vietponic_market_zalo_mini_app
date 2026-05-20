import { AppError, createShortcut, followOA } from "zmp-sdk/apis";

export interface PromptResult {
  ok: boolean;
  cancelled?: boolean;
  unsupported?: boolean;
}

function isZaloRuntime(): boolean {
  return typeof window !== "undefined" && !!window.ZJSBridge;
}

function classifyError(error: unknown): PromptResult {
  const code = (error as AppError)?.code;
  if (code === -201) {
    return { ok: false, cancelled: true };
  }
  console.warn("[zalo-prompts] SDK error", { code, error });
  return { ok: false };
}

export async function promptCreateShortcut(): Promise<PromptResult> {
  if (!isZaloRuntime()) {
    console.info("[zalo-prompts] createShortcut skipped (no ZJSBridge)");
    return { ok: false, unsupported: true };
  }
  try {
    await createShortcut({ params: { utm_source: "post_order" } });
    return { ok: true };
  } catch (error) {
    return classifyError(error);
  }
}

export async function promptFollowOA(oaId: string): Promise<PromptResult> {
  if (!isZaloRuntime()) {
    console.info("[zalo-prompts] followOA skipped (no ZJSBridge)");
    return { ok: false, unsupported: true };
  }
  if (!oaId) {
    console.warn("[zalo-prompts] followOA skipped (missing oaId)");
    return { ok: false, unsupported: true };
  }
  try {
    await followOA({ id: oaId });
    return { ok: true };
  } catch (error) {
    return classifyError(error);
  }
}
