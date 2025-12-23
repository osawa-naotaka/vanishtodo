import { type JSX, useEffect, useReducer, useState } from "react";
import type { Task, TaskInput } from "../type/types";
import { Business } from "./layer/Business";
import { Network } from "./layer/Network";
import { Persistent } from "./layer/Persistent";
import { AppBar } from "./layer/Presentation/AppBar";
import { BottomTaskFilter } from "./layer/Presentation/BottomTaskFilter";
import { Drawer } from "./layer/Presentation/Drawer";
import { EditableTaskView } from "./layer/Presentation/EditableTaskView";
import { TaskInputArea } from "./layer/Presentation/TaskInputArea";

type BizAction = { type: "init" } | { type: "edit"; task: Task } | { type: "create"; task: TaskInput };

function businessReducer([biz]: [Business], action: BizAction): [Business] {
    switch (action.type) {
        case "init": {
            biz.init(
                (e) => {
                    if (e.status === "success") {
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
            break;
        }
        case "edit": {
            biz.edit(action.task, (e) => {
                console.error(e);
            });
            break;
        }
        case "create": {
            biz.create(action.task, (e) => {
                console.error(e);
            });
            break;
        }
        default:
            break;
    }
    return [biz];
}

export function Home(): JSX.Element {
    const [[biz], dispatchBiz] = useReducer(businessReducer, [new Business(new Persistent(new Network("/api/v1")))]);
    const [filter, setFilter] = useState<"all" | "light" | "medium" | "heavy" | "due-date">("light");
    const current_date = new Date().toISOString();

    const filteredTasks = biz.filterTasks(current_date, filter) || [];

    useEffect(() => {
        dispatchBiz({ type: "init" });
    }, []);

    function handleEditTask(task: Task): void {
        dispatchBiz({ type: "edit", task });
    }

    function handleAddTask(task: TaskInput): void {
        dispatchBiz({ type: "create", task });
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
