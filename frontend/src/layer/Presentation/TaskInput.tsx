import type React from "react";
import type { JSX } from "react";
import { useState } from "react";
import type { TaskCreateContent } from "../../types";

export type TaskInputProps = {
    onAddTask: (data: TaskCreateContent) => void;
};

export function TaskInput({ onAddTask }: TaskInputProps): JSX.Element {
    const [title, setTitle] = useState<string>("");

    function handleAddTask(e: React.FormEvent<HTMLFormElement>): void {
        e.preventDefault();
        if (title.length > 0 && title.length <= 500) {
            onAddTask({ title });
            setTitle("");
        }
    }

    return (
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
    );
}
