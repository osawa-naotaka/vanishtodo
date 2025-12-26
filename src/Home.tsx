import { Home as HomeIcon, Settings as SettingsIcon, FormatListBulleted, TaskAlt, Delete as DeleteIcon } from "@mui/icons-material";
import { AppBar, Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, Divider, ListItemText } from "@mui/material";
import { type JSX, useEffect, useRef, useState } from "react";
import type { Task, TaskInput } from "../type/types";
import { Business } from "./layer/Business";
import { Network } from "./layer/Network";
import { Persistent } from "./layer/Persistent";

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
    return (
        <Box sx={{ display: "flex" }}>
            <Drawer
                variant="permanent" // 常に表示
                sx={{
                    display: { xs: "none", md: "block" }, // モバイルでは非表示
                    width: 280,
                    "& .MuiDrawer-paper": {
                        // 内部要素のスタイル
                        width: 280,
                        boxSizing: "border-box",
                    },
                }}
            >
                <List>
                    <ListItem>
                        <ListItemButton component="a" href="/">
                            <ListItemIcon>
                                <HomeIcon />
                            </ListItemIcon>
                            <ListItemText primary="ホーム" />
                        </ListItemButton>
                    </ListItem>
                    <ListItem>
                        <ListItemButton component="a" href="/all">
                            <ListItemIcon>
                                <FormatListBulleted />
                            </ListItemIcon>
                            <ListItemText primary="すべてのタスク" />
                        </ListItemButton>
                    </ListItem>
                    <ListItem>
                        <ListItemButton component="a" href="/completed">
                            <ListItemIcon>
                                <TaskAlt />
                            </ListItemIcon>
                            <ListItemText primary="完了したタスク" />
                        </ListItemButton>
                    </ListItem>
                    <ListItem>
                        <ListItemButton component="a" href="/deleted">
                            <ListItemIcon>
                                <DeleteIcon />
                            </ListItemIcon>
                            <ListItemText primary="削除したタスク" />
                        </ListItemButton>
                    </ListItem>
                    <Divider />
                    <ListItem>
                        <ListItemButton component="a" href="/settings">
                            <ListItemIcon>
                                <SettingsIcon />
                            </ListItemIcon>
                            <ListItemText primary="設定" />
                        </ListItemButton>
                    </ListItem>
                </List>
            </Drawer>

            <AppBar position="fixed" sx={{ display: { xs: "block", md: "none" } }}></AppBar>

            <Box component="main" sx={{ flexGrow: 1 }}></Box>
        </Box>
    );
}
