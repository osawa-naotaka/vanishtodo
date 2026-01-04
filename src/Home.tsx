import { Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import type { Task, TaskCreate } from "../type/types";
import { useBroker } from "./layer/Broker";
import { tasksToday } from "./layer/Business";
import type { SelectableTask } from "./layer/Presentation/ContextProvider";
import { EditableTaskList } from "./layer/Presentation/EditableTaskList";
import type { FilterType } from "./layer/Presentation/TaskFilter";
import { TaskFilter } from "./layer/Presentation/TaskFilter";
import { TaskInput } from "./layer/Presentation/TaskInput";

export function Home(): JSX.Element {
    const current_date = new Date().toISOString();
    const [filter, setFilter] = useState<FilterType>("all");
    const [tasks, setTasks] = useState<Task[]>([]);
    const { broker } = useBroker();

    useEffect(() => {
        broker.subscribe("update-task-list", (_broker, packet) => {
            setTasks(packet.tasks);
        });
    }, []);

    const filtered_tasks = tasksToday(
        current_date,
        { heavy: 5, medium: 5, light: 5 },
        tasks.filter((task) => filter === "all" || (filter === "due-date" && task.data.weight === undefined) || task.data.weight === filter),
    ).map((task) => ({ task, isSelected: false }));

    useEffect(() => {
        broker.publish("read-task-list", {});
    }, []);

    return (
        <Box component="main" sx={{ flexGrow: 1 }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
            <TaskInput handleAddTask={(task: TaskCreate) => broker.publish("create-task", { task })} userId={undefined} />
            <TaskFilter filter={filter} setFilter={setFilter} />
            <EditableTaskList
                tasks={filtered_tasks}
                current_date={current_date}
                onEditTask={(task: SelectableTask) => broker.publish("edit-task", { task: task.task })}
                onCompleteTask={(task: SelectableTask) => broker.publish("complete-task", { task: task.task })}
            />
        </Box>
    );
}
