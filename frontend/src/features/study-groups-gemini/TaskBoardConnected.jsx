import { useCallback, useEffect, useState } from "react";
import { createTask, getTasks, updateTask } from "./api";
import { getRealtimeSocket } from "../../realtime/socket";
import "./taskBoardFixes.css";

const columns = [
  { id: "TODO", title: "To do" },
  { id: "IN_PROGRESS", title: "In progress" },
  { id: "DONE", title: "Done" },
];

export default function TaskBoardConnected({ groupId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [movingTaskId, setMovingTaskId] = useState("");
  const [form, setForm] = useState({ title: "", priority: "Medium", dueDate: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTasks(await getTasks(groupId));
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Tasks could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
    const socket = getRealtimeSocket();
    const onTask = (task) => {
      if (String(task.groupId) !== String(groupId)) return;
      setTasks((current) => current.some((item) => item._id === task._id)
        ? current.map((item) => item._id === task._id ? task : item)
        : [task, ...current]);
    };
    socket.on("group:task", onTask);
    return () => socket.off("group:task", onTask);
  }, [groupId, load]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      const task = await createTask(groupId, form);
      setTasks((current) => current.some((item) => item._id === task._id) ? current : [task, ...current]);
      setForm({ title: "", priority: "Medium", dueDate: "" });
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Task could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const move = async (task, status) => {
    setMovingTaskId(task._id);
    try {
      const updated = await updateTask(groupId, task._id, { status });
      setTasks((current) => current.map((item) => item._id === updated._id ? updated : item));
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Task could not be updated.");
    } finally {
      setMovingTaskId("");
    }
  };

  const completed = tasks.filter((task) => task.status === "DONE").length;

  return <>
  <section className="sg-card sg-task-board">
    <div className="sg-section-head"><div><h2>Tasks &amp; Goals</h2><span className="sg-muted">Track the group&apos;s shared objectives</span></div><span className="sg-chip">{completed}/{tasks.length} complete</span></div>
    <form className="sg-task-create-form" onSubmit={submit}><label className="sg-field"><span>TASK OR GOAL</span><input required maxLength="160" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Add a task or goal" /></label><label className="sg-field"><span>PRIORITY</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} aria-label="Task priority"><option>Low</option><option>Medium</option><option>High</option></select></label><label className="sg-field"><span>DUE DATE <small>(optional)</small></span><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} aria-label="Task due date" /></label><button type="submit" className="sg-btn accent" disabled={saving}>{saving ? "Creating..." : "Create task"}</button></form>
    {error && <p className="sg-error-text" role="alert"><span>{error}</span> <button type="button" className="sg-btn" onClick={load}>Retry</button></p>}
    {loading ? <p className="sg-muted sg-task-state" role="status">Loading tasks...</p> : tasks.length ? <div className="sg-task-columns">{columns.map((column) => { const columnTasks = tasks.filter((task) => task.status === column.id); return <div className={`sg-card sg-task-column is-${column.id.toLowerCase()}`} key={column.id}><div className="sg-section-head"><div><h3>{column.title}</h3><span className="sg-muted">{column.id === "DONE" ? "Completed" : column.id === "IN_PROGRESS" ? "Currently active" : "Ready to start"}</span></div><span className="sg-chip">{columnTasks.length}</span></div>{columnTasks.map((task) => <article className="sg-row sg-task-item" key={task._id}><div className={`sg-dot sg-task-dot is-${String(task.priority || "medium").toLowerCase()}`} aria-hidden="true" /><div className="sg-task-copy"><strong>{task.title}</strong><small><span className={`sg-task-priority is-${String(task.priority || "medium").toLowerCase()}`}>{task.priority}</span>{task.dueDate ? ` Â· due ${new Date(task.dueDate).toLocaleDateString()}` : ""}</small></div><select value={task.status} disabled={movingTaskId === task._id} onChange={(event) => move(task, event.target.value)} aria-label={`Status for ${task.title}`}><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Done</option></select></article>)}{!columnTasks.length && <div className="sg-task-column-empty">No tasks here yet.</div>}</div>; })}</div> : <div className="sg-task-state"><strong>No tasks or goals yet</strong><p>Create the first shared objective and keep the group moving forward.</p><button type="button" className="sg-btn accent" onClick={() => document.querySelector(".sg-task-create-form input")?.focus()}>Create a task</button></div>}
  </section>
  </>;
}
