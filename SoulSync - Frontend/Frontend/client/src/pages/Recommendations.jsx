
function Recommendations() {
  const recommendations = [
    {
      icon: "🧘",
      title: "Practice Mindfulness",
      description:
        "Spend 10 minutes practicing meditation to reduce stress and improve focus.",
      category: "Mental Wellness",
      color: "bg-purple-100",
    },
    {
      icon: "😴",
      title: "Improve Sleep Quality",
      description:
        "Maintain a regular sleep schedule and avoid screens before bedtime.",
      category: "Sleep",
      color: "bg-blue-100",
    },
    {
      icon: "🚶",
      title: "Stay Physically Active",
      description:
        "Take a short walk or do light exercise to support your overall well-being.",
      category: "Physical Wellness",
      color: "bg-green-100",
    },
    {
      icon: "💧",
      title: "Stay Hydrated",
      description:
        "Drink enough water throughout the day to maintain healthy hydration.",
      category: "Daily Habits",
      color: "bg-cyan-100",
    },
    {
      icon: "📖",
      title: "Write a Daily Journal",
      description:
        "Write down your thoughts and feelings to understand your emotions better.",
      category: "Emotional Wellness",
      color: "bg-pink-100",
    },
    {
      icon: "🌿",
      title: "Take a Break",
      description:
        "Give yourself time to relax and enjoy activities that make you happy.",
      category: "Self-Care",
      color: "bg-yellow-100",
    },
  ];

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          AI Wellness Recommendations
        </h2>
        <p className="mt-2 text-gray-500">
          Helpful suggestions for a healthier and happier lifestyle.
        </p>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
        <h3 className="text-lg font-semibold text-indigo-700">
          💙 Your Daily Wellness Guide
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Small positive steps every day can make a meaningful difference
          in your mental and physical well-being.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

        {recommendations.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${item.color}`}>
              {item.icon}
            </div>

            <p className="mb-2 text-xs font-semibold text-indigo-500">
              {item.category}
            </p>

            <h3 className="mb-2 text-lg font-bold text-gray-800">
              {item.title}
            </h3>

            <p className="text-sm leading-6 text-gray-500">
              {item.description}
            </p>
          </div>
        ))}

      </div>

    </div>
  );
}

export default Recommendations;
