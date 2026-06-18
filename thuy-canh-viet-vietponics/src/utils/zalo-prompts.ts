import { AppError, createShortcut, followOA, getUserInfo } from "zmp-sdk/apis";

export interface PromptResult {
  ok: boolean;
  cancelled?: boolean;
  unsupported?: boolean;
  alreadyDone?: boolean;
}

function isZaloRuntime(): boolean {
  return typeof window !== "undefined" && !!window.ZJSBridge;
}

function classifyError(error: unknown): PromptResult {
  const code = (error as AppError)?.code;
  // -201: user dismissed the native prompt
  if (code === -201) {
    return { ok: false, cancelled: true };
  }
  // -1410: DUPLICATE_REQUEST — already done (already follows OA, shortcut already exists, etc.)
  if (code === -1410) {
    return { ok: true, alreadyDone: true };
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
  // Check follow status before showing the dialog — getUserInfo returns followedOA
  // when scope.userInfo is granted. If already following, skip silently.
  try {
    const { userInfo } = await getUserInfo({});
    if (userInfo?.followedOA === true) {
      console.info("[zalo-prompts] followOA skipped (already following)");
      return { ok: true, alreadyDone: true };
    }
  } catch {
    // If getUserInfo fails (rate-limit -1409, permission not granted, etc.), fall
    // through and let followOA decide — worst case the dialog shows unnecessarily.
  }
  try {
    await followOA({ id: oaId });
    return { ok: true };
  } catch (error) {
    return classifyError(error);
  }
}
