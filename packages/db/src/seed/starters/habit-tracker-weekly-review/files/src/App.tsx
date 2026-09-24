import './App.css'
import { APP_NAME } from "./config";

// The starting point. It runs, and that is all it does.
// Sprint 1 turns it into a tracker, one task at a time: open the Task tab for
// the task you are on, and "Check task" runs its tests.
export default function App() {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p className="muted">Nothing tracked yet.</p>
      <div className="card">Start with sprint 1, task 1.</div>
    </main>
  );
}
