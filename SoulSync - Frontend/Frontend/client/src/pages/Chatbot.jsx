
import { useState } from "react";

function Chatbot() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      text: "Hello! I'm SoulSync AI. How are you feeling today? 💙",
      sender: "ai",
    },
  ]);

  const handleSend = (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    setMessages((prev) => [
      ...prev,
      { text: message.trim(), sender: "user" },
    ]);

    setMessage("");
  };

  return (
    <div className="flex h-[calc(100vh-150px)] min-h-[450px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

      {/* Chat Header */}
      <div className="flex items-center gap-3 border-b p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-2xl">
          🤖
        </div>

        <div>
          <h2 className="font-bold text-gray-800">SoulSync AI Assistant</h2>
          <p className="text-sm text-green-500">Your Wellness Companion</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-5">

        {messages.map((item, index) => (
          <div
            key={index}
            className={`flex ${
              item.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 ${
                item.sender === "user"
                  ? "rounded-br-none bg-indigo-500 text-white"
                  : "rounded-bl-none border bg-white text-gray-700"
              }`}
            >
              {item.text}
            </div>
          </div>
        ))}

      </div>

      {/* Message Input */}
      <form onSubmit={handleSend} className="flex gap-3 border-t bg-white p-4">

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-500"
        />

        <button
          type="submit"
          disabled={!message.trim()}
          className="rounded-xl bg-indigo-500 px-6 py-3 font-medium text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>

      </form>

    </div>
  );
}

export default Chatbot;
