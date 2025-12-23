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

export function Home(): JSX.Element {
    const biz = useRef<Business>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filter, setFilter] = useState<"all" | "light" | "medium" | "heavy" | "due-date">("light");
    const current_date = new Date().toISOString();

    const filteredTasks = biz.current ? biz.current.filterTasks(current_date, filter, tasks) : [];

    useEffect(() => {
        const n = new Network("/api/v1");
        const p = new Persistent(n);
        biz.current = new Business(p);
        setTasks(biz.current.readTasksAll());
        biz.current.init(
            (e) => {
                if (e.status === "success") {
                    setTasks(e.data);
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
            biz.current.edit(task, (e) => {
                console.error(e);
            });
            setTasks(biz.current.readTasksAll());
        }
    }

    function handleAddTask(data: TaskInput): void {
        if (biz.current) {
            biz.current.create(data, (e) => {
                console.error(e);
            });
            setTasks(biz.current.readTasksAll());
        }
    }

    return (
        <div className="top-container-pc">
            <AppBar />
            <Drawer />
            <main className="responsive-mobile">
                <TaskInputArea onAddTask={handleAddTask} defaultDate={current_date} />
                <ul className="task-list">
                    {filteredTasks.map((task) => (
                        <EditableTaskView key={task.meta.id} task={task} current_date={current_date} handleEditTask={handleEditTask} />
                    ))}
                </ul>
            </main>
            <BottomTaskFilter filter={filter} onChange={setFilter} />
        </div>
    );
}
