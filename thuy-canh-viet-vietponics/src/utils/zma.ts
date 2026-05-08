import { getAccessToken as getZaloAccessToken } from "zmp-sdk/apis";
import { requestWithPost, requestWithGet } from "@/utils/request";

export function getBasePath() {
  const urlParams = new URLSearchParams(window.location.search);
  const appEnv = urlParams.get("env");

  if (
    import.meta.env.PROD ||
    appEnv === "TESTING_LOCAL" ||
    appEnv === "TESTING" ||
    appEnv === "DEVELOPMENT"
  ) {
    return `/zapps/${window.APP_ID}`;
  }

  return window.BASE_PATH || "";
}

export async function getAccessToken(): Promise<string> {
  const accessToken = await getZaloAccessToken({});
  return accessToken;
}

export async function decodeToken(token: string): Promise<string> {
  const accessToken = await getAccessToken();
  const response = await requestWithGet<{
    error: boolean;
    message: string;
    data?: {
      number: string;
    };
  }>("/infouser", {
    access_token: accessToken,
    code: token,
  });

  if (response.error || !response.data?.number) {
    throw new Error(response.message || "Failed to decode phone token");
  }

  return response.data.number;
}

export async function decodeLocationToken(token: string): Promise<{ lat: number; lng: number }> {
  const accessToken = await getAccessToken();
  const locationParams = { access_token: accessToken, code: token };
  console.log("[ZaloCheckout] /get-location - params gửi:", locationParams);
  const response = await requestWithPost<{
    access_token: string;
    code: string;
  }, {
    error: boolean;
    message: string;
    data?: {
      provider: string | null;
      latitude: number | null;
      longitude: number | null;
      timestamp: number | null;
    };
  }>("/get-location", locationParams);
  console.log("[ZaloCheckout] /get-location - result:", response);

  if (response.error || !response.data?.latitude || !response.data?.longitude) {
    throw new Error(response.message || "Failed to decode location token");
  }

  return {
    lat: response.data.latitude,
    lng: response.data.longitude,
  };
}
