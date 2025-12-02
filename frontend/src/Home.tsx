import { useEffect, useRef, useState, type JSX } from "react";
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
    }, [])

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

    function handleEditTask(event: React.ChangeEvent<HTMLInputElement>) {
        const input = event.currentTarget;
        const parent = input.parentElement;
        if(parent === null) throw new Error("Parent element is null");
        const taskIdx = parent.getAttribute("data-task-idx");
        if(taskIdx === null) throw new Error("Task index is null");
        const idx = parseInt(taskIdx, 10);
        const newTitle = input.value;
        if (biz.current) {
            const task = tasks[idx]
            const updatedTask: Task = {
                ...task,
                data: {
                    ...task.data,
                    title: newTitle,
                }
            };
            setTasks(biz.current.edit(updatedTask));
            console.log("Task edited:", updatedTask);
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
                {tasks.map((task, idx) => (
                    <li key={task.id} data-task-idx={idx}>
                        <input type="text" defaultValue={task.data.title} onInput={handleEditTask}/>
                    </li>
                ))}
            </ul>
        </main>
    );
}
