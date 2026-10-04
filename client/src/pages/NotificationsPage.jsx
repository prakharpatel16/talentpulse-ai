import { useEffect, useState } from "react";
import {
  Bell,
  BellRing,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  Clock3,
  FileText,
  MessageSquareText,
  Video,
  X,
} from "lucide-react";
import { api } from "../lib/api";

const iconFor = (type = "") =>
  type.includes("interview")
    ? Video
    : type.includes("resume")
      ? FileText
      : type.includes("application") || type.includes("shortlist")
        ? BriefcaseBusiness
        : MessageSquareText;
const relativeTime = (value) => {
  if (!value) return "Recently";
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    let active = true;
    api
      .get("/notifications?limit=50")
      .then((result) => {
        if (active) {
          setNotifications(result.notifications || []);
          setUnreadCount(result.unreadCount || 0);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const visible =
    filter === "unread"
      ? notifications.filter((notification) => !notification.isRead)
      : notifications;
  async function markRead(notification) {
    if (notification.isRead) return;
    try {
      await api.patch(`/notifications/${notification._id}/read`, {});
      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id ? { ...item, isRead: true } : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  async function markAllRead() {
    try {
      await api.patch("/notifications/read-all", {});
      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true })),
      );
      setUnreadCount(0);
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE UPDATES</p>
          <h1>Notifications</h1>
          <p>
            Keep up with application changes, interviews, and resume activity.
          </p>
        </div>
        <div className="heading-actions">
          {unreadCount > 0 && (
            <button className="button" onClick={markAllRead}>
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="notice error page-notice">
          {error}
          <button
            className="notice-close"
            onClick={() => setError("")}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <section className="panel notifications-panel">
        <div className="notification-filters">
          <div className="segmented-control">
            <button
              className={filter === "all" ? "selected" : ""}
              onClick={() => setFilter("all")}
            >
              All <span>{notifications.length}</span>
            </button>
            <button
              className={filter === "unread" ? "selected" : ""}
              onClick={() => setFilter("unread")}
            >
              Unread <span>{unreadCount}</span>
            </button>
          </div>
          <span className="notification-total">
            <Bell size={14} /> {unreadCount} unread
          </span>
        </div>
        {loading ? (
          <div className="loading-block">Loading notifications…</div>
        ) : visible.length ? (
          visible.map((notification) => {
            const Icon = iconFor(notification.type);
            return (
              <article
                className={`notification-row ${notification.isRead ? "" : "notification-unread"}`}
                key={notification._id}
                onClick={() => markRead(notification)}
              >
                <span
                  className={`notification-icon notification-${notification.type}`}
                >
                  <Icon size={16} />
                </span>
                <div className="notification-copy">
                  <strong>{notification.title || "TalentPulse update"}</strong>
                  <p>{notification.message}</p>
                  <span>
                    <Clock3 size={12} /> {relativeTime(notification.createdAt)}
                  </span>
                </div>
                {!notification.isRead && (
                  <span className="unread-indicator" aria-label="Unread" />
                )}
                <button
                  className="icon-button mark-read"
                  title={notification.isRead ? "Read" : "Mark as read"}
                  aria-label={
                    notification.isRead ? "Read notification" : "Mark as read"
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    markRead(notification);
                  }}
                >
                  {notification.isRead ? (
                    <Check size={14} />
                  ) : (
                    <BellRing size={14} />
                  )}
                </button>
              </article>
            );
          })
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Bell size={18} />
            </div>
            <h3>
              {filter === "unread"
                ? "You are all caught up"
                : "Nothing new right now"}
            </h3>
            <p>We’ll let you know when something needs your attention.</p>
          </div>
        )}
      </section>
    </>
  );
}
