/**
 * ScamShield Extension — Background Service Worker
 *
 * Handles all API communication. The popup sends a scan request via
 * chrome.runtime.sendMessage; the background script calls the backend
 * and replies with the result.
 *
 * Keeping API calls in the background avoids CSP restrictions that
 * prevent the popup from making cross-origin fetches.
 */

import type { ExtensionMessage } from "../types";
import { scanUrl } from "../api/client";

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    if (message.type !== "SCAN_URL") {
      return false;
    }

    // Run scan asynchronously and respond when done
    (async () => {
      const result = await scanUrl(message.url);

      if (result.success) {
        sendResponse({ type: "SCAN_RESULT", result: result.data });
      } else if (result.error.code === "RATE_LIMITED") {
        sendResponse({ type: "RATE_LIMITED" });
      } else {
        sendResponse({
          type: "SCAN_ERROR",
          message: result.error.message,
          code: result.error.code,
        });
      }
    })();

    // Return true to keep the message channel open for async sendResponse
    return true;
  }
);
