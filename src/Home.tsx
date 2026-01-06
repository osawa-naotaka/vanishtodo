import { Box, Toolbar } from "@mui/material";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import type { Container, TaskContent, TaskCreate, UserSetting, UserSettingContent } from "../type/types";
import { apiVoidSchema, tasksSchema, userSettingSchema } from "../type/types";
import type { SelectableTask } from "./layer/Broker";
import { generateLimitter } from "./layer/Business";
import { isLoginAtom, networkAtom, Persistent, tasksAtom, tasksWriterAtom, userIdAtom, userSettingAtom, userSettingInitialValue } from "./layer/Jotai";
import { generateItem, LocalStorage, type PersistentContentConfig, touchItem } from "./layer/Persistent";
import { EditableTaskList } from "./layer/Presentation/EditableTaskList";
import type { FilterType } from "./layer/Presentation/TaskFilter";
import { TaskFilter } from "./layer/Presentation/TaskFilter";
import { TaskInput } from "./layer/Presentation/TaskInput";

export const task_config: PersistentContentConfig<Container<TaskContent>[]> = {
    name: "tasks",
    storage_key: "vanish-todo-tasks",
    api_base: "/tasks",
    schema: tasksSchema,
    initial_value: [],
};

export const setting_config: PersistentContentConfig<Container<UserSettingContent>> = {
    name: "user_settings",
    storage_key: "vanish-todo-user-settings",
    api_base: "/setting",
    schema: userSettingSchema,
    initial_value: userSettingInitialValue,
};

export function Home(): JSX.Element {
    console.log("Home: render");
    const current_date = new Date().toISOString();
    const per_tasks = useRef<Persistent<TaskContent>>(new Persistent<TaskContent>(task_config));
    const ls_settings = useRef<LocalStorage<UserSetting>>(new LocalStorage<UserSetting>(setting_config));

    const tasks = useAtomValue(tasksAtom);
    const taskWriter = useSetAtom(tasksWriterAtom);
    const userId = useAtomValue(userIdAtom);
    const [userSetting, setUserSetting] = useAtom(userSettingAtom);
    const isLogin = useAtomValue(isLoginAtom);
    const network = useAtomValue(networkAtom);

    const [filter, setFilter] = useState<FilterType>("all");

    const { tasksToday } = generateLimitter<SelectableTask>((t) => t.task);
    const filtered_tasks = tasksToday(
        current_date,
        userSetting.data.dailyGoals,
        tasks.filter(({ task }) => filter === "all" || (filter === "due-date" && task.data.weight === undefined) || task.data.weight === filter),
    );

    async function addTask(task: TaskCreate): Promise<void> {
        const c: TaskContent = {
            ...task,
            completedAt: undefined,
            isDeleted: false,
            userId: userId,
        };
        const item = generateItem(c);
        per_tasks.current.create(item);
        taskWriter(per_tasks.current.items);
        if (isLogin) {
            const result = await network.postJson(task_config.api_base, item, apiVoidSchema);
            if (result.status !== "success") {
                console.error("Home: Failed to sync new task to server", result.error_info);
            }
        }
    }

    async function editTask(task: SelectableTask): Promise<void> {
        const updated = touchItem(task.task);
        per_tasks.current.update(updated);
        taskWriter(per_tasks.current.items);
        if (isLogin) {
            const result = await network.putJson(`${task_config.api_base}/${updated.meta.id}`, updated);
            if (result.status !== "success") {
                console.error("Home: Failed to sync edited task to server", result.error_info);
            }
        }
    }

    async function completeTask(task: SelectableTask): Promise<void> {
        const touched = touchItem<TaskContent>(task.task);
        touched.data.completedAt = touched.meta.updatedAt;
        per_tasks.current.update(touched);
        taskWriter(per_tasks.current.items);
        if (isLogin) {
            const result = await network.putJson(`${task_config.api_base}/${touched.meta.id}`, touched);
            if (result.status !== "success") {
                console.error("Home: Failed to sync completed task to server", result.error_info);
            }
        }
    }

    useEffect(() => {
        taskWriter(per_tasks.current.items);
        setUserSetting(ls_settings.current.item);
    }, []);

    return (
        <Box component="main" sx={{ flexGrow: 1 }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
            <TaskInput handleAddTask={(task: TaskCreate) => addTask(task)} userId={undefined} />
            <TaskFilter filter={filter} setFilter={setFilter} />
            <EditableTaskList
                tasks={filtered_tasks}
                current_date={current_date}
                onEditTask={(task: SelectableTask) => editTask(task)}
                onCompleteTask={(task: SelectableTask) => completeTask(task)}
            />
        </Box>
    );
}
