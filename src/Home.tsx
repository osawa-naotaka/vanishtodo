import { Home as HomeIcon } from "@mui/icons-material";
import { AppBar, Box, Drawer, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
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

const theme = createTheme({
    palette: {
        primary: {
            main: "#3F51B5", // VanishToDoのメインカラー
            light: "#5C6BC0",
            dark: "#303F9F",
        },
        secondary: {
            main: "#FF9800", // 中タスクの色
        },
    },
    typography: {
        fontFamily: 'Roboto, "Noto Sans JP", sans-serif',
        h5: {
            fontWeight: 500,
        },
    },
    spacing: 8, // 1単位 = 8px（sx={{mt: 2}} = margin-top: 16px）
});

export function Home(): JSX.Element {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
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
                            <ListItemIcon>
                                <HomeIcon />
                            </ListItemIcon>
                            <ListItemText primary="ホーム" />
                        </ListItem>
                    </List>
                </Drawer>

                <AppBar position="fixed" sx={{ display: { xs: "block", md: "none" } }}></AppBar>

                <Box component="main" sx={{ flexGrow: 1 }}></Box>
            </Box>
        </ThemeProvider>
    );
}
