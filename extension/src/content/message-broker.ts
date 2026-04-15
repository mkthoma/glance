import type { RuntimeRequest, RuntimeResponse } from "../shared/types";

export async function sendGlanceRequest(
  message: RuntimeRequest
): Promise<RuntimeResponse> {
  return await new Promise<RuntimeResponse>((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const runtimeError = chrome.runtime.lastError;

      if (runtimeError) {
        reject(
          new Error(
            `Glance background service is unavailable (${runtimeError.message}). Reload the extension in chrome://extensions and make sure the unpacked path is extension/dist.`
          )
        );
        return;
      }

      if (!response) {
        reject(
          new Error(
            "Glance background service did not return a response. Reload the extension in chrome://extensions and make sure the unpacked path is extension/dist."
          )
        );
        return;
      }

      resolve(response as RuntimeResponse);
    });
  });
}
