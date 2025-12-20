import { type JSX, useEffect, useRef, useState } from "react";
import type { Task } from "../type/types";
import { BottomButtons } from "./BottomButtons";
import { Business } from "./layer/Business";
import { Network } from "./layer/Network";
import { Persistent } from "./layer/Persistent";
import { AppBar } from "./layer/Presentation/AppBar";
import { Drawer } from "./layer/Presentation/Drawer";
import { TaskViewReadOnly } from "./layer/Presentation/TaskViewReadOnly";

export type TaskState = {
    task: Task;
    isSelected: boolean;
};

export function All(): JSX.Element {
    const biz = useRef<Business>(null);
    const [tasks, setTasks] = useState<TaskState[]>([]);
    const current_date = new Date().toISOString();

    useEffect(() => {
        const n = new Network("/api/v1");
        const p = new Persistent(n);
        biz.current = new Business(p);
        setTasks(biz.current.tasks.map((task) => ({ task, isSelected: false })));
        biz.current.init((e) => {
            if (e.status === "success") {
                setTasks(e.data.map((task) => ({ task, isSelected: false })));
            } else {
                console.error(e);
            }
        });
    }, []);

    function handleSelectTask(task: TaskState): void {
        if (biz.current) {
            const updatedTasks = tasks.map((t) => {
                if (t.task.meta.id === task.task.meta.id) {
                    return { ...t, isSelected: !t.isSelected };
                }
                return t;
            });
            setTasks(updatedTasks);
        }
    }

    function handleRevertSelected(): void {
        if (biz.current) {
            for (const t of tasks) {
                if (t.isSelected) {
                    t.task.data.completedAt = undefined;
                    biz.current.edit(t.task, (e) => {
                        console.error(e);
                    });
                }
            }
            setTasks(biz.current.tasks.map((task) => ({ task, isSelected: false })));
        }
    }

    return (
        <>
            <AppBar />
            <Drawer />
            <main className="responsive">
                <ul className="readonly-task-list">
                    {tasks.map((task) => (
                        <TaskViewReadOnly key={task.task.meta.id} task={task} current_date={current_date} handleSelectTask={() => handleSelectTask(task)} />
                    ))}
                </ul>
            </main>
            <BottomButtons countSelected={tasks.filter((task) => task.isSelected).length} handleRevertSelected={handleRevertSelected} />
        </>
    );
}
