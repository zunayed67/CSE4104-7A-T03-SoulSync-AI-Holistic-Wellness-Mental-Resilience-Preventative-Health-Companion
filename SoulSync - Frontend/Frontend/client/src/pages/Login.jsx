
import { useState } from "react";

function Login({ onLogin, onRegister }) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
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

          <p className="text-gray-500 mt-2">
            Your journey to better wellness starts here.
          </p>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Welcome Back!
        </h2>

        <p className="text-gray-500 mb-6">
          Please login to your account.
        </p>

        {/* Login Form */}
        <form onSubmit={handleLogin} noValidate>

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
                placeholder="Enter your password"
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
                className="absolute right-3 top-3 text-indigo-600 text-sm font-medium"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-sm mb-4">
              {error}
            </p>
          )}

          {/* Remember Me */}
          <div className="flex items-center justify-between mb-6">

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-indigo-600"
              />
              Remember Me
            </label>

            <button
              type="button"
              className="text-indigo-600 text-sm hover:underline"
            >
              Forgot Password?
            </button>

          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-indigo-500 text-white py-3 rounded-lg font-semibold hover:bg-indigo-600 transition"
          >
            Login
          </button>

        </form>

        {/* Sign Up */}
        <p className="text-center text-gray-600 mt-6 text-sm">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onRegister}
            className="text-indigo-600 font-semibold"
          >
            Sign Up
          </button>
        </p>

      </div>
    </div>
  );
}

export default Login;
