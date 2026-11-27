import { io } from "socket.io-client";
export const socket = io({
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
});
export function request<T = any>(
  event: string,
  data: unknown = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(
        new Error(
          "Server disconnected. Last screen is preserved; use local controls or reconnect.",
        ),
      );
      return;
    }
    socket
      .timeout(8000)
      .emit(event, data, (error: Error | null, response: any) => {
        if (error)
          reject(new Error("Server did not respond. Check your network."));
        else if (!response?.ok)
          reject(new Error(response?.error || "Request failed"));
        else resolve(response);
      });
  });
}
