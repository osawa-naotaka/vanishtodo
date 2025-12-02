import { type JSX, useEffect, useRef, useState } from "react";
import { Business } from "./layer/Business";
import { Persistent } from "./layer/Persistent";
import type { Task } from "./types";

export function Home(): JSX.Element {
    const biz = useRef<Business>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [title, setTitle] = useState<string>("");

    useEffect(() => {
        const p = new Persistent();
        biz.current = new Business(p);
        setTasks(biz.current.tasks);
    }, []);

    function handleAddTask(): void {
        if (title && biz.current) {
            setTasks(biz.current.create({ title }));
            setTitle("");
        }
    }

    function handleEditTask(task: Task, newTitle: string): void {
        if (biz.current) {
            task.data.title = newTitle;
            setTasks(biz.current.edit(task));
        }
    }

    return (
        <>
            <header>
                <div className="responsive">
                    <h1>VanishToDo</h1>
                    <button type="button">
                        <img src="asset/icon/bars.svg" alt="menu" className="icon" />
                    </button>
                </div>
            </header>
            <main className="responsive">
                <form className="card" onSubmit={handleAddTask}>
                    <input type="text" name="task" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New Task" />
                    <div className="row">
                        <button type="submit">＋ 追加</button>
                        <input type="radio" name="task" id="task-light" defaultChecked />
                        <label htmlFor="task-light">軽</label>
                        <input type="radio" name="task" id="task-medium" />
                        <label htmlFor="task-medium">中</label>
                        <input type="radio" name="task" id="task-heavy" />
                        <label htmlFor="task-heavy">重</label>
                        <input type="radio" name="task" id="task-duedate" />
                        <label htmlFor="task-duedate">締切</label>
                    </div>
                </form>
                <ul>
                    {tasks.map((task) => (
                        <li key={task.id} className="card">
                            <input type="checkbox" name="item" id={task.id} />
                            <input type="text" defaultValue={task.data.title} onInput={(e) => handleEditTask(task, e.currentTarget.value)} />
                        </li>
                    ))}
                </ul>
            </main>
            <footer>
                <div className="responsive">
                    <input type="radio" name="tab" id="tab-all" />
                    <label htmlFor="tab-all">すべて</label>
                    <input type="radio" name="tab" id="tab-light" defaultChecked />
                    <label htmlFor="tab-light">軽</label>
                    <input type="radio" name="tab" id="tab-medium" />
                    <label htmlFor="tab-medium">中</label>
                    <input type="radio" name="tab" id="tab-heavy" />
                    <label htmlFor="tab-heavy">重</label>
                    <input type="radio" name="tab" id="tab-duedate" />
                    <label htmlFor="tab-duedate">締切</label>
                </div>
            </footer>
        </>
    );
}
