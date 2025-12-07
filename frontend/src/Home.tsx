import { type JSX, useEffect, useRef, useState } from "react";
import { Business } from "./layer/Business";
import { Persistent } from "./layer/Persistent";
import { TaskInput } from "./layer/Presentation/TaskInput";
import { TaskView } from "./layer/Presentation/TaskView";
import type { Task, TaskCreateContent } from "./types";

export function Home(): JSX.Element {
    const biz = useRef<Business>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const current_date = new Date().toISOString();

    useEffect(() => {
        const p = new Persistent();
        biz.current = new Business(p);
        setTasks(biz.current.tasks);
    }, []);

    function handleEditTask(task: Task): void {
        if (biz.current) {
            setTasks(biz.current.edit(task));
        }
    }

    function handleAddTask(data: TaskCreateContent): void {
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
                <TaskInput onAddTask={handleAddTask} />
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
                    <input type="radio" name="tab" id="tab-duedate" />
                    <label htmlFor="tab-duedate">締切</label>
                </div>
            </footer>
        </>
    );
}
