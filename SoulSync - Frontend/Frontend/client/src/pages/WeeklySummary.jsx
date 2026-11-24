
function WeeklySummary() {
  const weeklyData = [
    { day: "Mon", mood: 75, sleep: 7, stress: 4 },
    { day: "Tue", mood: 90, sleep: 8, stress: 3 },
    { day: "Wed", mood: 60, sleep: 6, stress: 6 },
    { day: "Thu", mood: 80, sleep: 7, stress: 4 },
    { day: "Fri", mood: 95, sleep: 8, stress: 2 },
    { day: "Sat", mood: 70, sleep: 6, stress: 5 },
    { day: "Sun", mood: 85, sleep: 7, stress: 3 },
  ];

  const averageSleep = (
    weeklyData.reduce((total, item) => total + item.sleep, 0) /
    weeklyData.length
  ).toFixed(1);

  const averageStress = (
    weeklyData.reduce((total, item) => total + item.stress, 0) /
    weeklyData.length
  ).toFixed(1);

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Weekly Wellness Summary
        </h2>
        <p className="mt-2 text-gray-500">
          Review your weekly mental and physical wellness progress.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Average Sleep</p>
          <h3 className="mt-2 text-3xl font-bold text-indigo-600">
            {averageSleep} hrs
          </h3>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Average Stress</p>
          <h3 className="mt-2 text-3xl font-bold text-purple-600">
            {averageStress}/10
          </h3>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Tracked Days</p>
          <h3 className="mt-2 text-3xl font-bold text-green-600">
            {weeklyData.length}/7
          </h3>
        </div>

      </div>

      {/* Mood Chart */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">

        <h3 className="mb-6 text-lg font-bold text-gray-800">
          Weekly Mood Overview
        </h3>

        <div className="flex h-52 items-end justify-around gap-3 border-b border-gray-200 pb-2">

          {weeklyData.map((item) => (
            <div key={item.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">

              <div
                className="w-full max-w-12 rounded-t-lg bg-indigo-400"
                style={{ height: `${item.mood}%` }}
              ></div>

              <span className="text-xs text-gray-500">
                {item.day}
              </span>

            </div>
          ))}

        </div>

      </div>

      {/* Sleep Chart */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">

        <h3 className="mb-6 text-lg font-bold text-gray-800">
          Weekly Sleep Hours
        </h3>

        <div className="space-y-4">

          {weeklyData.map((item) => (
            <div key={item.day} className="flex items-center gap-3">

              <span className="w-10 text-sm text-gray-500">
                {item.day}
              </span>

              <div className="h-3 flex-1 rounded-full bg-gray-100">
                <div
                  className="h-3 rounded-full bg-blue-400"
                  style={{ width: `${(item.sleep / 10) * 100}%` }}
                ></div>
              </div>

              <span className="w-12 text-right text-sm font-medium text-gray-600">
                {item.sleep} hrs
              </span>

            </div>
          ))}

        </div>

      </div>

      {/* Stress Chart */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">

        <h3 className="mb-6 text-lg font-bold text-gray-800">
          Weekly Stress Levels
        </h3>

        <div className="space-y-4">

          {weeklyData.map((item) => (
            <div key={item.day} className="flex items-center gap-3">

              <span className="w-10 text-sm text-gray-500">
                {item.day}
              </span>

              <div className="h-3 flex-1 rounded-full bg-gray-100">
                <div
                  className="h-3 rounded-full bg-purple-400"
                  style={{ width: `${(item.stress / 10) * 100}%` }}
                ></div>
              </div>

              <span className="w-12 text-right text-sm font-medium text-gray-600">
                {item.stress}/10
              </span>

            </div>
          ))}

        </div>

      </div>

    </div>
  );
}

export default WeeklySummary;
