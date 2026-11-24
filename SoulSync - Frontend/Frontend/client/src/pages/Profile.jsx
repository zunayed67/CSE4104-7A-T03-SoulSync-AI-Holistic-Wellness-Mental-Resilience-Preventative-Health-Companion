
import { useState } from "react";

function Profile({ name: appName, onNameChange }) {
  const [name, setName] = useState(() => {
    return localStorage.getItem("soulSyncName") || "Samira";
  });

  const [email, setEmail] = useState(() => {
    return localStorage.getItem("soulSyncEmail") || "samira@example.com";
  });

  const [phone, setPhone] = useState(() => {
    return localStorage.getItem("soulSyncPhone") || "";
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = (e) => {
  e.preventDefault();

  localStorage.setItem("soulSyncName", name);
  localStorage.setItem("soulSyncEmail", email);
  localStorage.setItem("soulSyncPhone", phone);

  onNameChange(name);

  setIsEditing(false);
};
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-800">
          My Profile
        </h1>
        <p className="mb-6 text-gray-500">
          Manage your personal information.
        </p>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-8 flex flex-col items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-purple-100 text-3xl font-bold text-purple-600">
              {name.charAt(0).toUpperCase()}
            </div>
            <h2 className="mt-3 text-xl font-semibold text-gray-800">
              {name}
            </h2>
            <p className="text-sm text-gray-500">{email}</p>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isEditing}
                placeholder="Enter your phone number"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-purple-500 disabled:bg-gray-100"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-purple-600 px-5 py-2.5 text-white hover:bg-purple-700"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg bg-purple-600 px-5 py-2.5 text-white hover:bg-purple-700"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
