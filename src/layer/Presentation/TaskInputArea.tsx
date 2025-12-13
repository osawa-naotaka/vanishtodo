import type React from "react";
import type { JSX } from "react";
import { useState } from "react";
import type { TaskInput } from "../../../type/types";
import { formDateToISOString, ISOStringToFormDate } from "../../lib/date";

export type TaskInputProps = {
    onAddTask: (data: TaskInput) => void;
    defaultDate: string;
};

export function TaskInputArea({ onAddTask, defaultDate }: TaskInputProps): JSX.Element {
    const [title, setTitle] = useState<string>("");
    const [date, setDate] = useState<string>(ISOStringToFormDate(defaultDate));

    function handleAddTask(e: React.FormEvent<HTMLFormElement>): void {
        e.preventDefault();
        const form_data = new FormData(e.currentTarget);
        const selectedWeight = form_data.get("weight");

        if (title.length > 0 && title.length <= 500) {
            if (selectedWeight === "light" || selectedWeight === "medium" || selectedWeight === "heavy") {
                onAddTask({ title, weight: selectedWeight });
            } else {
                const due_date = form_data.get("due-date");
                if (due_date !== null) {
                    const dueDate = formDateToISOString(due_date.toString());
                    onAddTask({ title, dueDate });
                }
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
                <input type="date" name="due-date" id="due-date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
        </form>
    );
}
