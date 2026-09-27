import { apiRequest } from "./client.js";
import type { Notification } from "../types/index.js";

export async function listNotifications(): Promise<Notification[]> {
  const res = await apiRequest<{ notifications: Notification[] }>("/notifications");
  return res.notifications;
}

export function markNotificationRead(id: string): Promise<void> {
  return apiRequest(`/notifications/${id}/read`, { method: "POST" });
}
