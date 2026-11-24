import { useState } from "react";

function Notifications() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Daily Mood Check-in",
      message: "Take a moment to record how you are feeling today.",
      time: "Just now",
      icon: "😊",
      read: false,
    },
    {
      id: 2,
      title: "Sleep Reminder",
      message: "Maintain a regular sleep schedule for better wellness.",
      time: "1 hour ago",
      icon: "😴",
      read: false,
    },
    {
      id: 3,
      title: "Wellness Tip",
      message: "Remember to drink enough water throughout the day.",
      time: "3 hours ago",
      icon: "💧",
      read: true,
    },
    {
      id: 4,
      title: "Take a Break",
      message: "A short break can help you relax and improve focus.",
      time: "Yesterday",
      icon: "🌿",
      read: true,
    },
  ]);

  const markAsRead = (id) => {
    setNotifications((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, read: true } : item
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((previous) =>
      previous.map((item) => ({ ...item, read: true }))
    );
  };

  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Notifications
          </h2>
          <p className="mt-2 text-gray-500">
            Stay updated with your daily wellness activities.
          </p>
        </div>

        <button
          onClick={markAllAsRead}
          className="rounded-lg bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100"
        >
          Mark All as Read
        </button>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">Unread Notifications</p>
        <h3 className="mt-2 text-3xl font-bold text-indigo-600">
          {unreadCount}
        </h3>
      </div>

      <div className="space-y-4">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={`flex gap-4 rounded-xl border p-5 shadow-sm ${
              item.read ? "border-gray-200 bg-white" : "border-indigo-200 bg-indigo-50"
            }`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl">
              {item.icon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-gray-800">
                  {item.title}
                </h3>

                {!item.read && (
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
                    New
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                {item.message}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-gray-400">
                  {item.time}
                </span>

                {!item.read && (
                  <button
                    onClick={() => markAsRead(item.id)}
                    className="text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

export default Notifications;