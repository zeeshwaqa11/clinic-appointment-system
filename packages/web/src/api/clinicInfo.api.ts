import { apiRequest } from "./client.js";

export function getClinicTimezone(): Promise<{ timezone: string }> {
  return apiRequest("/clinic-info");
}
