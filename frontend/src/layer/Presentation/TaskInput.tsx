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
        const form_data = new FormData(e.currentTarget);
        const selectedWeight = form_data.get("weight");

        if (title.length > 0 && title.length <= 500) {
            if (selectedWeight === "light" || selectedWeight === "medium" || selectedWeight === "heavy") {
                onAddTask({ title, weight: selectedWeight });
            } else {
                onAddTask({ title, dueDate: new Date().toISOString() });
            }
            setTitle("");
        }
    }

    return (
        <form className="card" onSubmit={handleAddTask}>
            <input type="text" name="task" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New Task" />
            <div className="row">
                <button type="submit">＋ 追加</button>
                <input type="radio" name="weight" id="weight-light" value="light" defaultChecked />
                <label htmlFor="weight-light">軽</label>
                <input type="radio" name="weight" id="weight-medium" value="medium" />
                <label htmlFor="weight-medium">中</label>
                <input type="radio" name="weight" id="weight-heavy" value="heavy" />
                <label htmlFor="weight-heavy">重</label>
                <input type="radio" name="weight" id="weight-due-date" value="duedate" />
                <label htmlFor="weight-due-date">締切</label>
            </div>
        </form>
    );
}
