import { type JSX, useEffect, useRef, useState } from "react";
import { Business } from "./layer/Business";
import { Persistent } from "./layer/Persistent";
import type { Task } from "./types";

export function Home(): JSX.Element {
    const biz = useRef<Business>(null);
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        const p = new Persistent();
        biz.current = new Business(p);
        setTasks(biz.current.tasks);
    }, []);

    function handleAddTask(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const input = form.elements.namedItem("task") as HTMLInputElement;
        const title = input.value.trim();
        if (title && biz.current) {
            setTasks(biz.current.create({ title }));
            input.value = "";
        }
    }

    function handleEditTask(taskId: string, newTitle: string) {
        if (biz.current) {
            const task = tasks.find((t) => t.id === taskId);
            if (!task) throw new Error("Task not found");

            task.data.title = newTitle;
            setTasks(biz.current.edit(task));
        }
    }

    return (
        <main>
            <h1>VanishToDo</h1>
            <form onSubmit={handleAddTask}>
                <input type="text" name="task" placeholder="New Task" />
                <button type="submit">Add</button>
            </form>
            <ul>
                {tasks.map((task) => (
                    <li key={task.id}>
                        <input type="text" defaultValue={task.data.title} onInput={(e) => handleEditTask(task.id, e.currentTarget.value)} />
                    </li>
                ))}
            </ul>
        </main>
    );
}
