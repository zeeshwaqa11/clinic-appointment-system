import { useEffect, useRef, useState } from "react";
import { listNotifications, markNotificationRead } from "../api/notifications.api.js";
import type { Notification } from "../types/index.js";
import { formatDateTime } from "../utils/format.js";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    try {
      const list = await listNotifications();
      setNotifications(list);
    } catch {
      // notifications are a convenience feature; a failed fetch just shows none
    }
  }

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function handleOpen() {
    setOpen((prev) => !prev);
  }

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
            Notifications
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleMarkRead(n.id)}
                  className={`block w-full border-b border-slate-50 px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${
                    n.readAt ? "text-slate-400" : "font-medium text-slate-700"
                  }`}
                >
                  <p>{n.message}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
