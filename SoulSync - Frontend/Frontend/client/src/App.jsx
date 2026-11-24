
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Chatbot from "./pages/Chatbot";
import Recommendations from "./pages/Recommendations";
import WeeklySummary from "./pages/WeeklySummary";
import Notifications from "./pages/Notifications";
import AdminDashboard from "./pages/AdminDashboard";


function App() {
  const [mood, setMood] = useState(() => {
    return localStorage.getItem("soulSyncMood") || "";
  });

  const [activeSection, setActiveSection] = useState("Dashboard");

  const [sleepHours, setSleepHours] = useState(() => {
    return localStorage.getItem("soulSyncSavedSleep") || "";
  });

  const [savedSleep, setSavedSleep] = useState(() => {
    return localStorage.getItem("soulSyncSavedSleep") || "";
  });

  const [stressLevel, setStressLevel] = useState(() => {
    const saved = localStorage.getItem("soulSyncSavedStress");
    return saved ? Math.min(10, Math.max(1, Number(saved))) : 5;
  });

  const [savedStress, setSavedStress] = useState(() => {
    return localStorage.getItem("soulSyncSavedStress") || "";
  });

  const [journalText, setJournalText] = useState("");

  const [journalEntries, setJournalEntries] = useState(() => {
    const saved = localStorage.getItem("soulSyncJournal");
    return saved ? JSON.parse(saved) : [];
  });

  const [goalText, setGoalText] = useState("");

  const [goals, setGoals] = useState(() => {
    return JSON.parse(localStorage.getItem("soulSyncGoals")) || [];
  });

  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("soulSyncName") || "Samira";
  });

  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem("soulSyncLoggedIn") === "true"
      ? "dashboard"
      : "login";
  });

  const [wellnessActivities, setWellnessActivities] = useState(() => {
    const savedActivities = localStorage.getItem("soulSyncWellnessActivities");

    return savedActivities
      ? JSON.parse(savedActivities)
      : [
          { name: "Drink 8 glasses of water", completed: false },
          { name: "Take a 20-minute walk", completed: false },
          { name: "Meditate for 10 minutes", completed: false },
          { name: "Eat healthy food", completed: false },
          { name: "Get enough rest", completed: false },
        ];
  });

  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState("Inhale");
  const [breathingSeconds, setBreathingSeconds] = useState(4);
  const [breathingCycles, setBreathingCycles] = useState(0);

  const [selectedResource, setSelectedResource] = useState(null);

  // Navigation Items
  const navItems = [
    { label: "Dashboard", id: "dashboard" },
    { label: "Wellness Tracker", id: "wellness-tracker" },
    { label: "My Journal", id: "my-journal" },
    { label: "Goals & Habits", id: "goals-habits" },
    { label: "Breathing Exercises", id: "breathing-exercises" },
    { label: "Resources", id: "resources" },
    { label: "Profile", id: "profile" },
    { label: "AI Chatbot", id: "ai-chatbot" },
    { label: "AI Recommendations", id: "ai-recommendations" },
    { label: "Weekly Summary", id: "weekly-summary" },
    { label: "Notifications", id: "notifications" },
    { label: "Admin Dashboard", id: "admin-dashboard" },
  ];

  // Navigation Handler
  const handleNavigation = (item) => {
    setActiveSection(item.label);

    const targetSection = document.getElementById(item.id);

    if (targetSection) {
      targetSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const wellnessResources = {
    "Stress Management": {
      emoji: "🧘",
      description: "Take a deep breath, practice relaxation and divide large tasks into smaller steps.",
      tips: [
        "Practice deep breathing for a few minutes.",
        "Take short breaks between tasks.",
        "Try meditation or relaxing activities."
      ],
      cardStyle: "from-blue-50 to-indigo-50 border-blue-100 hover:border-indigo-300",
      titleStyle: "text-indigo-700 group-hover:text-indigo-900",
      linkStyle: "text-indigo-600",
      focusStyle: "focus-visible:ring-indigo-400"
    },

    "Healthy Sleep Habits": {
      emoji: "😴",
      description: "A healthy sleep routine helps improve your mood, focus and overall well-being.",
      tips: [
        "Maintain a regular sleep schedule.",
        "Avoid screens before bedtime.",
        "Create a calm and comfortable sleeping environment."
      ],
      cardStyle: "from-blue-50 to-sky-50 border-sky-100 hover:border-sky-300",
      titleStyle: "text-blue-700 group-hover:text-blue-900",
      linkStyle: "text-blue-600",
      focusStyle: "focus-visible:ring-sky-400"
    },

    "Self-Care Tips": {
      emoji: "💗",
      description: "Taking care of yourself is important for your mental and emotional well-being.",
      tips: [
        "Spend time doing activities you enjoy.",
        "Take breaks when you feel tired.",
        "Practice self-kindness and self-compassion."
      ],
      cardStyle: "from-pink-50 to-rose-50 border-pink-100 hover:border-pink-300",
      titleStyle: "text-pink-700 group-hover:text-pink-900",
      linkStyle: "text-pink-600",
      focusStyle: "focus-visible:ring-pink-400"
    },

    "Positive Thinking": {
      emoji: "🌱",
      description: "Small positive thoughts and achievements can help build a healthier mindset.",
      tips: [
        "Celebrate your small achievements.",
        "Write down things you are grateful for.",
        "Focus on what you can control."
      ],
      cardStyle: "from-purple-50 to-violet-50 border-purple-100 hover:border-violet-300",
      titleStyle: "text-purple-700 group-hover:text-purple-900",
      linkStyle: "text-purple-600",
      focusStyle: "focus-visible:ring-purple-400"
    },

    "Physical Wellness": {
      emoji: "🚶",
      description: "Healthy physical habits can support your mental well-being.",
      tips: [
        "Stay physically active in a comfortable way.",
        "Drink enough water.",
        "Spend some time outdoors."
      ],
      cardStyle: "from-yellow-50 to-amber-50 border-yellow-100 hover:border-yellow-300",
      titleStyle: "text-yellow-700 group-hover:text-yellow-900",
      linkStyle: "text-yellow-700",
      focusStyle: "focus-visible:ring-amber-400"
    },

    "Emotional Support": {
      emoji: "🤝",
      description: "Sharing your feelings with someone you trust can help you feel supported.",
      tips: [
        "Talk to someone you trust.",
        "Express your feelings openly.",
        "Seek professional support when needed."
      ],
      cardStyle: "from-green-50 to-emerald-50 border-green-100 hover:border-green-300",
      titleStyle: "text-green-700 group-hover:text-green-900",
      linkStyle: "text-green-600",
      focusStyle: "focus-visible:ring-green-400"
    }
  };

  const moods = [
    { emoji: "😊", name: "Happy" },
    { emoji: "😌", name: "Calm" },
    { emoji: "🙄", name: "Neutral" },
    { emoji: "😔", name: "Sad" },
    { emoji: "😣", name: "Stressed" },
  ];

  // Mood LocalStorage
  useEffect(() => {
    localStorage.setItem("soulSyncMood", mood);
  }, [mood]);

  // Username LocalStorage
  useEffect(() => {
    localStorage.setItem("soulSyncName", userName);
  }, [userName]);

  // Sleep LocalStorage
  useEffect(() => {
    if (savedSleep !== "") {
      localStorage.setItem("soulSyncSavedSleep", savedSleep);
    }
  }, [savedSleep]);

  // Stress LocalStorage
  useEffect(() => {
    if (savedStress !== "") {
      localStorage.setItem("soulSyncSavedStress", savedStress);
    }
  }, [savedStress]);

  // Goals LocalStorage
  useEffect(() => {
    localStorage.setItem("soulSyncGoals", JSON.stringify(goals));
  }, [goals]);

  // Daily Wellness LocalStorage
  useEffect(() => {
    localStorage.setItem(
      "soulSyncWellnessActivities",
      JSON.stringify(wellnessActivities)
    );
  }, [wellnessActivities]);

  // Breathing Exercise Timer
  useEffect(() => {
    if (!breathingActive) return;

    const timer = setTimeout(() => {
      if (breathingSeconds > 1) {
        setBreathingSeconds(breathingSeconds - 1);
      } else {
        if (breathingPhase === "Inhale") {
          setBreathingPhase("Hold");
          setBreathingSeconds(4);
        } else if (breathingPhase === "Hold") {
          setBreathingPhase("Exhale");
          setBreathingSeconds(6);
        } else {
          setBreathingPhase("Inhale");
          setBreathingSeconds(4);
          setBreathingCycles((count) => count + 1);
        }
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [breathingActive, breathingPhase, breathingSeconds]);

  // Prevent Background Scroll When Popup Is Open
  useEffect(() => {
    if (!selectedResource) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedResource]);
  // Close Wellness Popup with Escape Key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedResource(null);
      }
    };
    if (selectedResource) {
      window.addEventListener("keydown", handleEscape);
    }
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedResource]);

  // Sidebar Active Section on Scroll
  useEffect(() => {
    if (currentPage !== "dashboard") return;

    const mainContent = document.querySelector("main");

    if (!mainContent) return;

    const sectionNames = {
      dashboard: "Dashboard",
      "wellness-tracker": "Wellness Tracker",
      "my-journal": "My Journal",
      "goals-habits": "Goals & Habits",
      "breathing-exercises": "Breathing Exercises",
      resources: "Resources",
      profile: "Profile",
      "ai-chatbot": "AI Chatbot",
      "ai-recommendations": "AI Recommendations",
      "weekly-summary": "Weekly Summary",
      notifications: "Notifications",
      "admin-dashboard": "Admin Dashboard"
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => b.intersectionRatio - a.intersectionRatio
          );
        if (visibleSections.length > 0) {
          const sectionId = visibleSections[0].target.id;

          if (sectionNames[sectionId]) {
            setActiveSection(sectionNames[sectionId]);
          }
        }
      },
      {
        root: mainContent,
        threshold: 0.15
      }
    );
    Object.keys(sectionNames).forEach((id) => {
      const section = document.getElementById(id);
      if (section) {
        observer.observe(section);
      }
    });
    return () => observer.disconnect();
  }, [currentPage]);

// Login Page
if (currentPage === "login") {
  return (
   <Login
  onLogin={() => {
    localStorage.setItem("soulSyncLoggedIn", "true");
    setCurrentPage("dashboard");
  }}
  onRegister={() => setCurrentPage("register")}
/>
  );
}

// Register Page
if (currentPage === "register") {
  return (
    <Register
      onLogin={() => setCurrentPage("login")}
    />
  );
}

const handleLogout = () => {
  localStorage.removeItem("soulSyncLoggedIn");
  setCurrentPage("login");
  setActiveSection("Dashboard");
};

return (
  <div className="h-screen overflow-hidden flex flex-col bg-bg-main text-text-main">

    {/* Header */}
<header className="bg-white border-b border-border px-6 py-3 flex justify-between items-center shrink-0 shadow-sm">
  <div className="flex items-center gap-3">

    <img
      src="/soulsync.jpeg"
      alt="SoulSync AI Logo"
      className="w-14 h-14 object-contain transition-transform duration-300 hover:scale-110"
    />

   <h1 className="text-3xl font-bold text-indigo-500 tracking-tight hover:text-indigo-600 transition-colors duration-300">
     SoulSync AI
   </h1>

  </div>

  <div className="flex items-center gap-3">

    <span className="text-sm text-gray-600 hidden sm:block">
  Welcome, {userName}!
</span>

    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shadow-sm hover:shadow-md hover:scale-110 transition-all duration-300 cursor-pointer">
        S
      </div>

    <button
  onClick={() => {
    localStorage.removeItem("soulSyncLoggedIn");
    setCurrentPage("login");
    setActiveSection("Dashboard");
  }}
  className="bg-red-500 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-red-600 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
>
  Logout
</button>

  </div>

</header>


{/* Mobile Navigation */}
<div className="md:hidden bg-white border-b p-3 overflow-x-auto shrink-0">
  <nav className="flex gap-2 min-w-max">
    {[
      "Dashboard",
      "Wellness Tracker",
      "My Journal",
      "Goals & Habits",
      "Breathing Exercises",
      "Resources",
      "Profile",
      "AI Chatbot",
      "AI Recommendations",
      "Weekly Summary",
      "Notifications",
      "Admin Dashboard"
    ].map((item) => (
      <button
        key={item}
        onClick={() => {
          setActiveSection(item);

          const sectionId = item === "Goals & Habits"
            ? "goals-habits"
            : item.toLowerCase().replaceAll(" ", "-");

          document.getElementById(sectionId)?.scrollIntoView({
            behavior: "smooth"
          });
        }}
        className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
  activeSection === item
    ? "bg-indigo-100 text-indigo-700 font-semibold shadow-sm"
    : "bg-gray-50 text-gray-600 hover:bg-indigo-50"
}`}
      >
        {item}
      </button>
    ))}
  </nav>
</div>

     <div className="flex flex-1 min-h-0 overflow-hidden">

{/* Sidebar */}
<aside className="hidden md:block w-64 h-full shrink-0 overflow-y-auto bg-bg-sidebar border-r border-border p-5">

  <h2 className="text-xs font-semibold text-text-light mb-5 tracking-wider">
    MAIN MENU
  </h2>

  <nav className="space-y-3">
    {navItems.map((item) => {
      const isActive = activeSection === item.label;

      return (
        <button
          key={item.id}
          onClick={() => handleNavigation(item)}
          className={`group relative w-full flex items-center text-left p-3 rounded-xl transition-all duration-300 ease-in-out hover:translate-x-1 ${
            isActive
              ? "bg-primary text-white font-semibold shadow-md shadow-primary/20"
              : "text-text-main hover:bg-bg-soft hover:shadow-sm"
          }`}
        >
          {/* Active Indicator */}
          {isActive && (
            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white"></span>
          )}

          {/* Menu Text */}
          <span className="ml-2">
            {item.label}
          </span>

          {/* Active Arrow */}
          {isActive && (
            <span className="ml-auto text-white text-sm">
              →
            </span>
          )}
        </button>
      );
    })}
  </nav>

</aside>


        {/* Main Content */}
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto p-6 md:p-10">

      <div id="dashboard" className="mb-8">

            <h2 className="text-3xl md:text-4xl font-bold text-text-main tracking-tight mb-3">
              Welcome to SoulSync AI
            </h2>

            <p className="text-text-light text-base md:text-lg leading-relaxed">
              Your journey to better wellness starts here.
            </p>
          </div>

          {/* Wellness Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            <div className="bg-bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-lg hover:-translate-y-2 hover:border-indigo-300 transition-all duration-300">
              <p className="text-text-light text-sm font-medium mb-3">Mood</p>
              <h3 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                {mood || "Not recorded"}
              </h3>
              <p className="text-sm text-text-light mt-2">
                Track your daily mood
              </p>
            </div>

            <div className="bg-bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-lg hover:-translate-y-2 hover:border-indigo-300 transition-all duration-300">
              <p className="text-text-light text-sm font-medium mb-3">Sleep</p>
             <h3 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
             {savedSleep ? `${savedSleep} Hours` : "Not recorded"}
               </h3> 
              <p className="text-sm text-text-light mt-2">
                Monitor your sleep habits
              </p>
            </div>

            <div className="bg-bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-lg hover:-translate-y-2 hover:border-indigo-300 transition-all duration-300">
             <p className="text-text-light text-sm font-medium mb-3">Stress Level</p>
           <h3 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
              {savedStress ? `${savedStress}/10` : "Not recorded"}
           </h3>

               <p className="text-sm text-text-light mt-2">
             {savedStress
              ? Number(savedStress) <= 3
              ? "Low Stress"
              : Number(savedStress) <= 6
              ? "Moderate Stress"
              : "High Stress"
              : "Monitor your stress levels"}
              </p>
           </div>

          </div>

          {/* Mood Tracker */}
        <div id="wellness-tracker" className="mt-10 bg-white rounded-2xl border border-border p-7 shadow-sm">

            <h2 className="text-xl font-bold mb-2">
              How are you feeling today?
            </h2>

            <p className="text-gray-500 mb-6">
              Select your current mood.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">

              {moods.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setMood(item.name)}
                 className={`group p-4 rounded-xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-lg ${
                  mood === item.name
                  ? "bg-indigo-100 border-indigo-400 text-indigo-700 shadow-md"
                  : "bg-white border-gray-200 hover:bg-indigo-50"
                        }`}
                              >
                  <div className="text-3xl mb-2 transition-transform duration-300 group-hover:scale-125">
                        {item.emoji}
                            </div>

                  <p className="font-medium text-sm">
                    {item.name}
                  </p>
                </button>
              ))}

            </div>

            {mood && (
              <p className="mt-6 text-indigo-600 font-medium">
                Your current mood is: {mood}
              </p>
            )}

          </div>

          {/* Daily Wellness */}

          {/* Sleep Tracker */}
<div className="mt-10 bg-white rounded-2xl border border-border p-7 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">

  <h2 className="text-xl font-bold mb-2">
    How many hours did you sleep?
  </h2>

  <p className="text-gray-500 mb-5">
    Track your daily sleep duration.
  </p>

  <div className="flex flex-col sm:flex-row gap-3">

    <input
      type="number"
      min="0"
      max="24"
      step="0.5"
      value={sleepHours}
      onChange={(e) => setSleepHours(e.target.value)}
      placeholder="Enter sleep hours"
     className="border border-border rounded-xl p-3 flex-1 outline-none bg-white focus:border-primary focus:ring-2 focus:ring-blue-100 transition-all duration-300"
    />

    <button
      onClick={() => {
        if (
    sleepHours !== "" &&
       Number(sleepHours) > 0 &&
       Number(sleepHours) <= 24
        )
         {
    setSavedSleep(sleepHours);
     } else {
       alert("Please enter sleep hours between 0 and 24.");
             }
      }}
      className="bg-indigo-400 text-white px-6 py-3 rounded-lg hover:bg-primary-dark"
    >
      Save Sleep
    </button>

  </div>

  {savedSleep !== "" && (
    <p className="mt-4 text-green-600 font-medium">
      You slept for {savedSleep} hours.
    </p>
  )}

</div>

 
{/* Stress Tracker */}
<div
  className={`mt-10 bg-white rounded-2xl border border-border p-7 transition-all duration-300 hover:-translate-y-1 ${
    stressLevel <= 3
      ? "shadow-md hover:shadow-green-200"
      : stressLevel <= 6
      ? "shadow-md hover:shadow-yellow-200"
      : "shadow-md hover:shadow-red-200"
  }`}
>
  <h2 className="text-xl font-bold mb-2">
    How stressed are you feeling?
  </h2>

  <p className="text-gray-500 mb-6">
    Rate your current stress level from 1 to 10.
  </p>

  <div className="flex justify-between items-center mb-4">
    <span className="text-sm text-gray-500">
      Your Stress Level
    </span>

    <span className="text-2xl font-bold text-purple-600">
      {stressLevel}/10
    </span>
  </div>

  <input
    type="range"
    min="1"
    max="10"
    value={stressLevel}
    onChange={(e) => setStressLevel(Number(e.target.value))}
    className="w-full accent-purple-600 cursor-pointer"
  />

  <div className="flex justify-between text-sm text-gray-500 mt-2">
    <span>Relaxed</span>
    <span>Moderate</span>
    <span>Very Stressed</span>
  </div>

  <div className="mt-6 p-4 rounded-lg bg-accent">
    <p
      className={`font-semibold ${
        stressLevel <= 3
          ? "text-green-500"
          : stressLevel <= 6
          ? "text-yellow-500"
          : "text-red-500"
      }`}
    >
      {stressLevel <= 3
        ? "Low Stress"
        : stressLevel <= 6
        ? "Moderate Stress"
        : "High Stress"}
    </p>

    <p className="text-sm text-gray-600 mt-1">
      {stressLevel <= 3
        ? "You seem relaxed. Keep maintaining your balance."
        : stressLevel <= 6
        ? "Take a short break and give yourself some time."
        : "Consider taking a break and trying a breathing exercise."}
    </p>
  </div>

  <button
    onClick={() => {
      const safeStress = Math.min(
        10,
        Math.max(1, Number(stressLevel))
      );

      setStressLevel(safeStress);
      setSavedStress(safeStress);
      localStorage.setItem("soulSyncSavedStress", safeStress);
    }}
    className="mt-5 bg-purple-400 text-white px-6 py-3 rounded-lg hover:bg-purple-500 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
  >
    Save Stress Level
  </button>

  {savedStress !== "" && (
    <p className="mt-4 text-green-600 font-medium">
      Your stress level has been recorded: {savedStress}/10
    </p>
  )}
</div>

 
{/* Daily Wellness */}
<div className="mt-10 bg-white rounded-2xl border border-border p-7 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

  <h2 className="text-xl font-bold mb-2 text-gray-800">
    Daily Wellness
  </h2>

  <p className="text-gray-500 mb-6">
    Complete your daily wellness activities.
  </p>

  {/* Progress Information */}
  <div className="flex justify-between items-center mb-3">
    <span className="font-semibold text-gray-700">
      Today's Progress
    </span>

    <span className="text-indigo-600 font-semibold">
      {wellnessActivities.filter(item => item.completed).length}/
      {wellnessActivities.length} Completed
    </span>
  </div>

  {/* Progress Percentage */}
  <div className="flex justify-between items-center mb-2">
    <span className="text-sm text-gray-500">
      Completion Rate
    </span>

    <span className="text-sm font-bold text-indigo-600">
      {wellnessActivities.length > 0
        ? Math.round(
            (wellnessActivities.filter(item => item.completed).length /
              wellnessActivities.length) * 100
          )
        : 0}%
    </span>
  </div>

  {/* Progress Bar */}
  <div className="w-full bg-gray-200 rounded-full h-3 mb-6 overflow-hidden">
    <div
      className="bg-gradient-to-r from-indigo-400 to-purple-500 h-3 rounded-full transition-all duration-700 ease-in-out"
      style={{
        width: `${
          wellnessActivities.length > 0
            ? (wellnessActivities.filter(item => item.completed).length /
                wellnessActivities.length) * 100
            : 0
        }%`
      }}
    ></div>
  </div>

  {/* Wellness Activities */}
  <div className="space-y-3">

    {wellnessActivities.map((activity, index) => (
      <label
        key={index}
        className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
          activity.completed
            ? "bg-indigo-50 border-indigo-200 shadow-sm"
            : "bg-white border-border hover:bg-accent"
        }`}
      >

        <input
          type="checkbox"
          checked={activity.completed}
          onChange={() => {
            setWellnessActivities(prev =>
              prev.map((item, i) =>
                i === index
                  ? { ...item, completed: !item.completed }
                  : item
              )
            );
          }}
          className="w-5 h-5 accent-indigo-600 cursor-pointer"
        />

        <span
          className={`font-medium transition-all duration-300 ${
            activity.completed
              ? "line-through text-gray-400"
              : "text-gray-700"
          }`}
        >
          {activity.name}
        </span>

        {activity.completed && (
          <span className="ml-auto text-xs font-semibold text-indigo-600">
            Completed
          </span>
        )}

      </label>
    ))}

  </div>

  {/* Completion Message */}
  {wellnessActivities.length > 0 &&
    wellnessActivities.every(item => item.completed) && (
      <div className="mt-6 p-4 rounded-xl bg-green-50 border border-green-200 text-center">
        <p className="font-semibold text-green-700">
          Amazing! All activities completed today!
        </p>
        <p className="text-sm text-green-600 mt-1">
          Keep taking care of yourself. 💜
        </p>
      </div>
    )}

</div>


{/* My Journal */}
<div
  id="my-journal"
  className="mt-10 bg-white rounded-2xl border border-border p-7 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
>

  {/* Heading */}
  <h2 className="text-xl font-bold mb-2 text-gray-800">
    My Journal
  </h2>

  <p className="text-gray-500 mb-5">
    Express your thoughts and feelings freely.
  </p>

  {/* Journal Textarea */}
  <textarea
    value={journalText}
    onChange={(e) => setJournalText(e.target.value)}
    placeholder="Write about your day, feelings or thoughts..."
    rows="5"
    className="w-full border border-border rounded-2xl p-5 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 hover:bg-accent hover:shadow-md transition-all duration-300 resize-y"
  />

  {/* Character Count */}
  <div className="flex justify-end mt-2">
    <span className="text-xs text-gray-400">
      {journalText.length} characters
    </span>
  </div>

  {/* Save Button */}
  <button
    onClick={() => {
      if (journalText.trim() === "") {
        alert("Please write something first.");
        return;
      }

      const newEntry = {
        id: Date.now(),
        text: journalText.trim(),
        date: new Date().toLocaleString()
      };

      const updatedEntries = [newEntry, ...journalEntries];

      setJournalEntries(updatedEntries);

      localStorage.setItem(
        "soulSyncJournal",
        JSON.stringify(updatedEntries)
      );

      setJournalText("");
    }}
    className="mt-4 bg-indigo-500 text-white px-6 py-3 rounded-xl hover:bg-indigo-600 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
  >
    Save Journal
  </button>

  {/* Previous Entries */}
  <div className="mt-8">

    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-bold text-gray-800">
        Previous Entries
      </h3>

      <span className="text-sm text-indigo-600 font-semibold">
        {journalEntries.length} Entries
      </span>
    </div>

    {journalEntries.length === 0 ? (
      <div className="text-center p-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50">
        <div className="text-4xl mb-3">
          📖
        </div>

        <p className="text-gray-500 font-medium">
          No journal entries yet.
        </p>

        <p className="text-gray-400 text-sm mt-1">
          Your thoughts and memories will appear here.
        </p>
      </div>
    ) : (
      <div className="space-y-4">

        {journalEntries.map((entry) => (
          <div
            key={entry.id}
            className="border border-border rounded-xl p-5 bg-white hover:bg-accent hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >

            {/* Entry Date */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-gray-400">
                {entry.date}
              </span>

              <span className="text-xs text-indigo-500 font-medium">
                Journal Entry
              </span>
            </div>

            {/* Entry Text */}
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {entry.text}
            </p>

            {/* Delete Button */}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  const updatedEntries = journalEntries.filter(
                    (item) => item.id !== entry.id
                  );

                  setJournalEntries(updatedEntries);

                  localStorage.setItem(
                    "soulSyncJournal",
                    JSON.stringify(updatedEntries)
                  );
                }}
                className="text-red-500 text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-50 hover:text-red-700 transition-all duration-300"
              >
                Delete Entry
              </button>
            </div>

          </div>
        ))}

      </div>
    )}

  </div>

</div>


{/* Goals & Habits Tracker */}
<div
  id="goals-habits"
  className="mt-10 bg-white rounded-2xl border border-border p-7 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
>
  {/* Heading */}
  <h2 className="text-xl font-bold mb-2 text-gray-800">
    Goals & Habits Tracker
  </h2>

  <p className="text-gray-500 mb-5">
    Set your daily goals and build healthy habits.
  </p>

  {/* Add Goal */}
  <div className="flex flex-col sm:flex-row gap-3">

    <input
      type="text"
      value={goalText}
      onChange={(e) => setGoalText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && goalText.trim() !== "") {
          setGoals(prev => [
            ...prev,
            {
              id: Date.now(),
              text: goalText.trim(),
              completed: false
            }
          ]);
          setGoalText("");
        }
      }}
      placeholder="Enter a new goal..."
      className="flex-1 border border-border rounded-xl p-3 outline-none bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:shadow-sm transition-all duration-300"
    />

    <button
      onClick={() => {
        if (goalText.trim() === "") {
          alert("Please enter a goal.");
          return;
        }

        setGoals(prev => [
          ...prev,
          {
            id: Date.now(),
            text: goalText.trim(),
            completed: false
          }
        ]);

        setGoalText("");
      }}
      className="bg-indigo-500 text-white px-6 py-3 rounded-xl hover:bg-indigo-600 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
    >
      + Add Goal
    </button>

  </div>

  {/* Goals Progress */}
  <div className="mt-7">

    <div className="flex justify-between items-center mb-3">
      <h3 className="font-semibold text-gray-700">
        Your Daily Goals
      </h3>

      <span className="text-sm font-semibold text-indigo-600">
        {goals.filter(goal => goal.completed).length}/{goals.length} Completed
      </span>
    </div>

    {/* Completion Percentage */}
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-gray-500">
        Overall Progress
      </span>

      <span className="text-sm font-bold text-indigo-600">
        {goals.length > 0
          ? Math.round(
              (goals.filter(goal => goal.completed).length / goals.length) * 100
            )
          : 0}%
      </span>
    </div>

    {/* Progress Bar */}
    <div className="w-full bg-gray-200 rounded-full h-3 mb-6 overflow-hidden">
      <div
        className="bg-gradient-to-r from-indigo-400 to-purple-500 h-3 rounded-full transition-all duration-700 ease-in-out"
        style={{
          width: goals.length > 0
            ? `${(goals.filter(goal => goal.completed).length / goals.length) * 100}%`
            : "0%"
        }}
      ></div>
    </div>

    {/* Empty State */}
    {goals.length === 0 ? (
      <div className="text-center p-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50">
        <div className="text-4xl mb-3">
          🎯
        </div>

        <p className="text-gray-600 font-medium">
          No goals added yet.
        </p>

        <p className="text-gray-400 text-sm mt-1">
          Start by adding your first goal!
        </p>
      </div>
    ) : (

      /* Goal List */
      <div className="space-y-3">

        {goals.map((goal) => (
          <div
            key={goal.id}
            className={`flex items-center justify-between gap-3 border rounded-xl p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${
              goal.completed
                ? "bg-indigo-50 border-indigo-200"
                : "bg-white border-border hover:bg-accent"
            }`}
          >

            <label className="flex items-center gap-3 flex-1 cursor-pointer">

              <input
                type="checkbox"
                checked={goal.completed}
                onChange={() => {
                  setGoals(prev =>
                    prev.map(item =>
                      item.id === goal.id
                        ? { ...item, completed: !item.completed }
                        : item
                    )
                  );
                }}
                className="w-5 h-5 accent-indigo-600 cursor-pointer"
              />

              <span
                className={`font-medium transition-all duration-300 ${
                  goal.completed
                    ? "text-gray-400 line-through"
                    : "text-gray-700"
                }`}
              >
                {goal.text}
              </span>

            </label>

            <button
              onClick={() => {
                setGoals(prev =>
                  prev.filter(item => item.id !== goal.id)
                );
              }}
              className="text-red-500 text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-50 hover:text-red-700 transition-all duration-300"
            >
              Delete
            </button>

          </div>
        ))}

      </div>

    )}

    {/* All Goals Completed */}
    {goals.length > 0 && goals.every(goal => goal.completed) && (
      <div className="mt-5 p-4 rounded-xl bg-green-50 border border-green-200 text-center">
        <p className="font-semibold text-green-700">
          Amazing! All your goals are completed! 🎉
        </p>

        <p className="text-sm text-green-600 mt-1">
          Keep building positive habits every day.
        </p>
      </div>
    )}

  </div>

</div>

 
{/* Breathing Exercises */}
<div
  id="breathing-exercises"
  className="mt-10 bg-white rounded-2xl border border-border p-7 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
>
  {/* Heading */}
  <h2 className="text-2xl font-extrabold mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
    Breathing Exercises
  </h2>

  <p className="text-gray-500 text-sm md:text-base mb-8 leading-relaxed">
    Relax your mind with guided breathing exercises.
  </p>

  <div className="flex flex-col items-center text-center">

    {/* Breathing Circle */}
    <div
      className={`relative w-48 h-48 sm:w-52 sm:h-52 rounded-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-blue-100 border-4 border-indigo-300 shadow-lg transition-all duration-1000 ease-in-out ${
        breathingActive
          ? breathingPhase === "Inhale"
            ? "scale-110 shadow-indigo-300 ring-8 ring-indigo-100"
            : breathingPhase === "Hold"
            ? "scale-110 shadow-purple-300 ring-8 ring-purple-100"
            : "scale-90 shadow-blue-300 ring-4 ring-blue-100"
          : "scale-100 shadow-sm"
      }`}
    >
      <span className="absolute inset-2 rounded-full border border-white/60"></span>

      <h3 className="relative text-2xl font-extrabold text-indigo-700">
        {breathingPhase}
      </h3>

      <p className="relative text-5xl font-extrabold text-indigo-600 mt-2 tabular-nums">
        {breathingSeconds}
      </p>

      <p className="relative text-sm text-gray-500 mt-1">
        Seconds
      </p>
    </div>

    {/* Instruction */}
    <p className="text-gray-600 text-sm sm:text-base mt-7 max-w-md mx-auto leading-relaxed">
      {breathingActive
        ? breathingPhase === "Inhale"
          ? "Breathe in slowly and gently..."
          : breathingPhase === "Hold"
          ? "Hold your breath comfortably..."
          : "Breathe out slowly and relax..."
        : "Follow the breathing instructions and enjoy a peaceful moment."}
    </p>

    {/* Activity Status */}
    <span
      className={`mt-4 px-4 py-2 rounded-full text-xs font-semibold ${
        breathingActive
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {breathingActive ? "● Exercise in Progress" : "● Exercise Paused"}
    </span>

    {/* Control Buttons */}
    <div className="flex flex-wrap justify-center gap-3 mt-6 w-full">

      <button
        onClick={() => setBreathingActive(true)}
        disabled={breathingActive}
        className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100"
      >
        Start
      </button>

      <button
        onClick={() => setBreathingActive(false)}
        disabled={!breathingActive}
        className="bg-gradient-to-r from-orange-400 to-rose-500 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100"
      >
        Pause
      </button>

      <button
        onClick={() => {
          setBreathingActive(false);
          setBreathingPhase("Inhale");
          setBreathingSeconds(4);
          setBreathingCycles(0);
        }}
        className="bg-gradient-to-r from-slate-500 to-gray-600 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 hover:scale-105 transition-all duration-300"
      >
        Reset
      </button>

    </div>

    {/* Breathing Guide */}
    <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 w-full border border-indigo-100 shadow-sm hover:shadow-md transition-all duration-300">

      <h3 className="font-bold text-indigo-700 text-lg mb-4">
        Your Breathing Guide
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Inhale */}
        <div
          className={`rounded-2xl p-4 transition-all duration-300 ${
            breathingPhase === "Inhale" && breathingActive
              ? "bg-indigo-100 ring-2 ring-indigo-300 shadow-md scale-105"
              : "bg-white shadow-sm hover:shadow-lg hover:-translate-y-1"
          }`}
        >
          <p className="text-indigo-600 font-bold text-2xl">
            4 sec
          </p>
          <p className="text-sm text-gray-600 mt-1 font-medium">
            Inhale
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Breathe in
          </p>
        </div>

        {/* Hold */}
        <div
          className={`rounded-2xl p-4 transition-all duration-300 ${
            breathingPhase === "Hold" && breathingActive
              ? "bg-purple-100 ring-2 ring-purple-300 shadow-md scale-105"
              : "bg-white shadow-sm hover:shadow-lg hover:-translate-y-1"
          }`}
        >
          <p className="text-purple-600 font-bold text-2xl">
            4 sec
          </p>
          <p className="text-sm text-gray-600 mt-1 font-medium">
            Hold
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Stay comfortable
          </p>
        </div>

        {/* Exhale */}
        <div
          className={`rounded-2xl p-4 transition-all duration-300 ${
            breathingPhase === "Exhale" && breathingActive
              ? "bg-blue-100 ring-2 ring-blue-300 shadow-md scale-105"
              : "bg-white shadow-sm hover:shadow-lg hover:-translate-y-1"
          }`}
        >
          <p className="text-blue-600 font-bold text-2xl">
            6 sec
          </p>
          <p className="text-sm text-gray-600 mt-1 font-medium">
            Exhale
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Breathe out
          </p>
        </div>

      </div>
    </div>

    {/* Completed Cycles */}
    <div className="mt-7 bg-gradient-to-br from-white to-indigo-50 border border-indigo-100 rounded-2xl px-8 py-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">

      <p className="text-gray-500 text-sm font-medium">
        Completed Cycles
      </p>

      <p className="text-4xl font-extrabold text-indigo-600 mt-2 tabular-nums">
        {breathingCycles}
      </p>

      <p className="text-xs text-gray-400 mt-2">
        Keep going at your own pace.
      </p>

    </div>

  </div>
</div>

{/* Profile Page */}
<div id="profile" className="mt-8">
  <Profile
    name={userName}
    onNameChange={setUserName}
  />
</div>

{/* AI Chatbot */}
<div id="ai-chatbot" className="mt-8">
  <Chatbot />
</div>

{/* AI Recommendations */}
<div id="ai-recommendations" className="mt-8">
  <Recommendations />
</div>

{/* Weekly Summary */}
<div id="weekly-summary" className="mt-8">
  <WeeklySummary />
</div>

{/* Notifications */}
<div id="notifications" className="mt-8">
  <Notifications />
</div>

{/* Admin Dashboard */}
<div id="admin-dashboard" className="mt-8">
  <AdminDashboard />
</div>

        </main>
      </div>
    </div>
  );
}

export default App;
