import { type JSX, useEffect, useRef, useState } from "react";
import type { Task, TaskInput } from "../type/types";
import { Business } from "./layer/Business";
import { Network } from "./layer/Network";
import { Persistent } from "./layer/Persistent";
import { AppBar } from "./layer/Presentation/AppBar";
import { BottomTaskFilter } from "./layer/Presentation/BottomTaskFilter";
import { Drawer } from "./layer/Presentation/Drawer";
import { EditableTaskView } from "./layer/Presentation/EditableTaskView";
import { TaskInputArea } from "./layer/Presentation/TaskInputArea";

export function useTasks(current_date: string): {
    tasks: Task[];
    handleAddTask: (data: TaskInput) => void;
    handleEditTask: (task: Task) => void;
    filter: "all" | "light" | "medium" | "heavy" | "due-date";
    setFilter: (filter: "all" | "light" | "medium" | "heavy" | "due-date") => void;
} {
    const biz = useRef<Business>(null);
    const [raw_tasks, setRawTasks] = useState<Task[]>([]);
    const [filter, setFilter] = useState<"all" | "light" | "medium" | "heavy" | "due-date">("light");

    const tasks = biz.current ? biz.current.filterTasks(current_date, filter, raw_tasks, biz.current.readSetting()) : [];

    useEffect(() => {
        const n = new Network("/api/v1");
        const p = new Persistent(n);
        biz.current = new Business(p);
        setRawTasks(biz.current.readTasksAll());
        biz.current.init(
            (e) => {
                if (e.status === "success") {
                    setRawTasks(e.data);
                } else {
                    console.error(e);
                }
            },
            (e) => {
                if (e.status !== "success") {
                    console.error(e);
                }
            },
        );
    }, []);

    function handleEditTask(task: Task): void {
        if (biz.current) {
            setRawTasks(
                biz.current.edit(task, (e) => {
                    console.error(e);
                }),
            );
        }
    }

    function handleAddTask(data: TaskInput): void {
        if (biz.current) {
            setRawTasks(
                biz.current.create(data, (e) => {
                    console.error(e);
                }),
            );
        }
    }

    return { tasks, handleAddTask, handleEditTask, filter, setFilter };
}

export function Home(): JSX.Element {
    const current_date = new Date().toISOString();
    const { tasks, handleAddTask, handleEditTask, filter, setFilter } = useTasks(current_date);
    return (
        <div className="top-container-pc">
            <AppBar />
            <Drawer />
            <main className="responsive-mobile">
                <TaskInputArea onAddTask={handleAddTask} defaultDate={current_date} />
                <ul className="task-list">
                    {tasks.map((task) => (
                        <EditableTaskView key={task.meta.id} task={task} current_date={current_date} handleEditTask={handleEditTask} />
                    ))}
                </ul>
            </main>
            <BottomTaskFilter filter={filter} onChange={setFilter} />
        </div>
    );
}
