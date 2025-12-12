import { type JSX, useEffect, useRef, useState } from "react";
import type { Task, TaskInput } from "../type/types";
import { Business } from "./layer/Business";
import { Network } from "./layer/Network";
import { Persistent } from "./layer/Persistent";
import { TaskInputArea } from "./layer/Presentation/TaskInputArea";
import { TaskView } from "./layer/Presentation/TaskView";

export function Home(): JSX.Element {
    const biz = useRef<Business>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const current_date = new Date().toISOString();

    useEffect(() => {
        const n = new Network("/api/v1");
        const p = new Persistent(n);
        biz.current = new Business(p);
        setTasks(biz.current.tasks);
        biz.current.init().then((v) => {
            if (v.status === "success") {
                setTasks(v.data);
            }
        });
    }, []);

    function handleEditTask(task: Task): void {
        if (biz.current) {
            setTasks(biz.current.edit(task));
        }
    }

    function handleAddTask(data: TaskInput): void {
        if (biz.current) {
            setTasks(biz.current.create(data));
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
                <TaskInputArea onAddTask={handleAddTask} defaultDate={current_date} />
                <ul>
                    {tasks.map((task) => (
                        <TaskView key={task.meta.id} task={task} current_date={current_date} handleEditTask={handleEditTask} />
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
                    <input type="radio" name="tab" id="tab-due-date" />
                    <label htmlFor="tab-due-date">締切</label>
                </div>
            </footer>
        </>
    );
}
