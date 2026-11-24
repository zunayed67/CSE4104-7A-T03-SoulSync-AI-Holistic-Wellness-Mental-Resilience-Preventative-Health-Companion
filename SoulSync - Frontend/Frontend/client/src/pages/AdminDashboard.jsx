import { useState } from "react";

function AdminDashboard() {
  const [search, setSearch] = useState("");

  const users = [
    { id: 1, name: "Samira Islam", email: "samira@gmail.com", status: "Active" },
    { id: 2, name: "Nusrat Jahan", email: "nusrat@gmail.com", status: "Active" },
    { id: 3, name: "Rahim Ahmed", email: "rahim@gmail.com", status: "Inactive" },
    { id: 4, name: "Ayesha Akter", email: "ayesha@gmail.com", status: "Active" },
  ];

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { title: "Total Users", value: "1,250", icon: "👥", color: "bg-blue-100" },
    { title: "Active Users", value: "980", icon: "🟢", color: "bg-green-100" },
    { title: "Wellness Activities", value: "3,450", icon: "💚", color: "bg-purple-100" },
    { title: "New Users", value: "125", icon: "✨", color: "bg-pink-100" },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Admin Dashboard
        </h2>
        <p className="mt-2 text-gray-500">
          Manage users and monitor SoulSync platform activities.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{item.title}</p>
                <h3 className="mt-3 text-2xl font-bold text-gray-800">
                  {item.value}
                </h3>
              </div>

              <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${item.color}`}>
                {item.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800">
          Recent Platform Activity
        </h3>

        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">👤</span>
            <div>
              <p className="text-sm font-medium text-gray-700">
                A new user registered.
              </p>
              <p className="text-xs text-gray-400">10 minutes ago</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xl">📝</span>
            <div>
              <p className="text-sm font-medium text-gray-700">
                A user completed a wellness journal entry.
              </p>
              <p className="text-xs text-gray-400">30 minutes ago</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xl">🧘</span>
            <div>
              <p className="text-sm font-medium text-gray-700">
                A user completed a breathing exercise.
              </p>
              <p className="text-xs text-gray-400">1 hour ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-800">
            User Management
          </h3>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-indigo-400 sm:w-64"
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[550px] text-left">
            <thead>
              <tr className="border-b bg-gray-50 text-sm text-gray-500">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="px-4 py-4 text-sm font-medium text-gray-700">
                      {user.name}
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-500">
                      {user.email}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          user.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-4 py-6 text-center text-sm text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default AdminDashboard;