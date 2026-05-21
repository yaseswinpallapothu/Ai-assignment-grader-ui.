import { useState, useEffect } from "react";
import jsPDF from "jspdf";

const API = "https://tk5cb04oei.execute-api.us-east-1.amazonaws.com/prod";

export default function App() {
  const [user, setUser] = useState(localStorage.getItem("user"));

  return user ? (
    <Dashboard user={user} setUser={setUser} />
  ) : (
    <Auth setUser={setUser} />
  );
}

function Auth({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async () => {
    if (!email || !password) {
      return alert("Please enter email and password");
    }

    try {
      const endpoint = isLogin ? "/login" : "/signup";

      const res = await fetch(API + endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      const parsed =
        typeof data.body === "string" ? JSON.parse(data.body) : data;

      if (!res.ok) {
        return alert(parsed.message || "Request failed");
      }

      // ✅ After successful signup/login
      localStorage.setItem("user", email);
      setUser(email);

    } catch (err) {
      console.error("API ERROR:", err);
      alert("Failed to connect to server (check API Gateway / CORS)");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-200 to-blue-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? "Login" : "Sign Up"}
        </h2>

        <input className="w-full p-3 mb-3 border rounded-lg" placeholder="Email"
          onChange={(e) => setEmail(e.target.value)} />

        <input type="password" className="w-full p-3 mb-3 border rounded-lg"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)} />

        <button onClick={submit}
          className="w-full bg-indigo-600 text-white p-3 rounded-lg">
          {isLogin ? "Login" : "Sign Up"}
        </button>

        <p className="text-center mt-4 text-blue-600 cursor-pointer"
          onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Create account" : "Back to login"}
        </p>
      </div>
    </div>
  );
}

function Dashboard({ user, setUser }) {
  const [dark, setDark] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [fileName, setFileName] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("assignments")) || [];
    setAssignments(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const saveAssignment = () => {
    if (!text) return alert("Nothing to save!");

    const newAssignment = {
      id: Date.now(),
      name: fileName || "Untitled",
      content: text,
      result,
    };

    const updated = [newAssignment, ...assignments];
    setAssignments(updated);
    localStorage.setItem("assignments", JSON.stringify(updated));
  };

  const loadAssignment = (a) => {
    setText(a.content);
    setResult(a.result);
    setFileName(a.name);
  };

  const deleteAssignment = (id) => {
    const updated = assignments.filter((a) => a.id !== id);
    setAssignments(updated);
    localStorage.setItem("assignments", JSON.stringify(updated));
  };

  const evaluate = async () => {
    try {
      const res = await fetch(API + "/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      // simple handling (old version)
      const parsed =
        typeof data.body === "string" ? JSON.parse(data.body) : data;

      setResult(parsed);

    } catch (err) {
      console.error("Evaluation failed:", err);
      alert("Server error");
    }
  };

  const ask = async () => {
    if (!question) return;

    const q = question.toLowerCase().trim();

    // 🔥 Reset chat if user says hi
    if (["hi", "hello", "hey"].includes(q)) {
      setChat([]);
    }

    try {
      setLoading(true);

      // ⏳ Fake typing delay
      await new Promise((res) => setTimeout(res, 800));

      let reply;

      if (chat.length === 0) {
        reply = "Hello 👋, how can I help you?";
      } else if (chat.length === 1) {
        reply = "I understand your issue. Please provide more details so I can help";
      } else {
        reply = "Please contact customer support";
      }

      setChat((prev) => [...prev, { q: question, a: reply }]);
      setQuestion("");

    } catch (err) {
      console.error(err);
      setChat((prev) => [...prev, { q: question, a: "Server error" }]);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setText(content);
      evaluate();
    };
    reader.readAsText(file);
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  //////////////////////////////////////////////////////
  // ✅ FIXED PDF FUNCTION
  //////////////////////////////////////////////////////
  const downloadPDF = () => {
    if (!result) return alert("No feedback");

    const doc = new jsPDF();
    let y = 20;

    const addLine = (label, value) => {
      const lines = doc.splitTextToSize(`${label}: ${value}`, 170);
      doc.text(lines, 20, y);
      y += lines.length * 7;
    };

    doc.setFontSize(16);
    doc.text("AI Grader Report", 20, y);
    y += 10;

    doc.setFontSize(12);
    addLine("User", user);
    addLine("Score", result.score);
    addLine("Grammar", result.grammar);
    addLine("Structure", result.structure);
    addLine("Strengths", result.strengths);
    addLine("Improvements", result.improvements);
    addLine("Overall", result.overall);

    doc.save("AI_Grader_Report.pdf");
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">

      {/* TOP BAR */}
      <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow">
        <h1 className="text-xl font-bold text-indigo-600">EduGrade-AI</h1>

        <div className="flex items-center gap-4 relative">
          <button onClick={() => setDark(!dark)}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded">
            {dark ? "☀️" : "🌙"}
          </button>

          <div className="relative">
            <button onClick={() => setShowProfile(!showProfile)}
              className="w-10 h-10 rounded-full bg-indigo-600 text-white">
              {user?.charAt(0).toUpperCase()}
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 shadow rounded p-3">
                <p className="text-sm dark:text-white">{user}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1">

       {/* 📂 SIDEBAR */}
<aside className="w-72 bg-white dark:bg-gray-800 p-4 shadow flex flex-col justify-between">
  
  {/* TOP */}
  <div>
    <h2 className="text-lg font-bold mb-4 text-indigo-600">
      Saved Assignments
    </h2>

    {assignments.length === 0 ? (
      <p className="text-gray-400 text-sm">No assignments</p>
    ) : (
      assignments.map((a) => (
        <div
          key={a.id}
          className="p-3 bg-gray-100 dark:bg-gray-700 rounded mb-2"
        >
          <p
            onClick={() => loadAssignment(a)}
            className="cursor-pointer dark:text-white"
          >
            {a.name}
          </p>

          <button
            onClick={() => deleteAssignment(a.id)}
            className="text-xs text-red-500"
          >
            Delete
          </button>
        </div>
      ))
    )}
  </div>

  {/* 🔻 LOGOUT */}
  <button
    onClick={logout}
    className="text-red-500 mt-4"
  >
    Logout
  </button>

</aside>
        {/* MAIN */}
        <main className="flex-1 p-8">

          <div className="grid md:grid-cols-2 gap-6">

            {/* INPUT */}
            <div className="bg-white p-6 rounded shadow">
              <input type="file" onChange={uploadFile} />

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-32 border mt-2"
              />

              <div className="flex gap-2 mt-2">
                <button onClick={evaluate} className="bg-indigo-600 text-white px-3 py-1">
                  Evaluate
                </button>
                <button onClick={saveAssignment} className="bg-green-600 text-white px-3 py-1">
                  Save
                </button>
              </div>
            </div>

            {/* RESULT */}
            <div className="bg-white p-6 rounded shadow">
              {!result && <p>No result</p>}

              {result && (
                <div>
                  <button onClick={downloadPDF}
                    className="mb-3 bg-blue-600 text-white px-3 py-1">
                    Download PDF
                  </button>
                <div className="bg-blue-100 p-3 rounded">
                  Score: {result.score}/100
                </div>
                <div className="bg-yellow-100 p-3 rounded">
                  {result.grammar}
                </div>
                <div className="bg-purple-100 p-3 rounded">
                  {result.structure}
                </div>
                <div className="bg-green-100 p-3 rounded">
                  {result.strengths}
                </div>
                <div className="bg-red-100 p-3 rounded">
                  {result.improvements}
                </div>
                <div className="bg-gray-200 p-3 rounded">
                  {result.overall}
                </div>
              </div>
            )}
          </div>
        </div>

          {/* CHAT */}
          <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
            <h3 className="mb-3 font-semibold dark:text-white">
              Chat Assistant 💬
            </h3>

            <div className="h-40 overflow-y-auto mb-3">
              {chat.map((c, i) => (
                <div key={i} className="mb-3">
                  <div className="text-right">
                    <span className="inline-block bg-indigo-600 text-white px-3 py-2 rounded-lg">
                      {c.q}
                    </span>
                  </div>

                  <div className="text-left mt-1">
                    <span className="inline-block bg-gray-200 dark:bg-gray-700 dark:text-white px-3 py-2 rounded-lg">
                      {c.a}
                    </span>
                  </div>
                </div>
              ))}

              {loading && (
                <p className="text-gray-500 italic">AI is typing...</p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 border p-2 rounded dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={ask}
                className="bg-indigo-600 text-white px-4 rounded"
              >
                Send
              </button>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}