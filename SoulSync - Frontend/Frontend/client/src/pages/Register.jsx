
import { useState } from "react";

function Register({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();
    setError("");

    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    onLogin();
  };

  return (
    <div className="min-h-screen bg-[#eaf6fb] flex items-center justify-center p-4">

      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-8">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">

          <img
            src="/soulsync.jpeg"
            alt="SoulSync AI Logo"
            className="w-16 h-16 object-contain mb-3"
          />

          <h1 className="text-3xl font-bold text-indigo-600">
            SoulSync AI
          </h1>

          <p className="text-gray-500 mt-2 text-center">
            Your journey to better wellness starts here.
          </p>

        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Create Account
        </h2>

        <p className="text-gray-500 mb-6">
          Join us and start your wellness journey.
        </p>

        {/* Registration Form */}
        <form onSubmit={handleRegister} noValidate>

          {/* Full Name */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Full Name
            </label>

            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Email Address
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="w-full border border-gray-300 rounded-lg p-3 pr-16 outline-none focus:border-indigo-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-indigo-600 text-sm"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Confirm Password
            </label>

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-sm mb-4">
              {error}
            </p>
          )}

          {/* Register Button */}
          <button
            type="submit"
            className="w-full bg-indigo-500 text-white py-3 rounded-lg font-semibold hover:bg-indigo-600 transition"
          >
            Create Account
          </button>

        </form>

        {/* Login Link */}
        <p className="text-center text-gray-600 mt-6 text-sm">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onLogin}
            className="text-indigo-600 font-semibold"
          >
            Login
          </button>
        </p>

      </div>
    </div>
  );
}

export default Register;
