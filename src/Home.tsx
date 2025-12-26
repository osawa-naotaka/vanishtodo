import { Delete as DeleteIcon, FormatListBulleted, Home as HomeIcon, Menu as MenuIcon, Settings as SettingsIcon, TaskAlt } from "@mui/icons-material";
import {
    AppBar,
    Box,
    Button,
    Divider,
    Drawer,
    FormControl,
    FormControlLabel,
    FormLabel,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Radio,
    RadioGroup,
    TextField,
    Toolbar,
    Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { type JSX, useEffect, useRef, useState } from "react";
import * as v from "valibot";
import type { Task, TaskInput } from "../type/types";
import { Business } from "./layer/Business";
import { Network } from "./layer/Network";
import { Persistent } from "./layer/Persistent";
import { TaskWeightBadge } from "./layer/Presentation/TaskWeightBadge";
import { shortPastDate } from "./lib/date";

export function useTasks(): {
    tasks: Task[];
    handleAddTask: (data: TaskInput) => void;
    handleEditTask: (task: Task) => void;
} {
    const biz = useRef<Business>(null);
    const [tasks, setTasks] = useState<Task[]>([]);

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
            setTasks(
                biz.current.edit(task, (e) => {
                    console.error(e);
                }),
            );
        }
    }

    function handleAddTask(data: TaskInput): void {
        if (biz.current) {
            setTasks(
                biz.current.create(data, (e) => {
                    console.error(e);
                }),
            );
        }
    }

    return { tasks, handleAddTask, handleEditTask };
}

const weightSchema = v.picklist(["light", "medium", "heavy", "due-date"]);

type Weight = v.InferOutput<typeof weightSchema>;

export function Home(): JSX.Element {
    const current_date = new Date().toISOString();
    // const [filter, setFilter] = useState<"all" | "light" | "medium" | "heavy" | "due-date">("light");
    // const filtered_tasks = biz.current ? biz.current.filterTasks(current_date, filter, tasks, biz.current.readSetting()) : [];

    const { tasks, handleAddTask, handleEditTask } = useTasks();
    const [taskTitle, setTaskTitle] = useState("");
    const [taskWeight, setTaskWeight] = useState<Weight>("light");
    const [taskDueDate, setTaskDueDate] = useState<Dayjs>();
    const [open, setOpen] = useState(false);

    const onAddTask = () => {
        if (taskTitle.trim()) {
            if (taskWeight === "due-date" && taskDueDate) {
                handleAddTask({ title: taskTitle, dueDate: taskDueDate.toISOString() });
                setTaskTitle("");
            } else if (taskWeight !== "due-date") {
                handleAddTask({ title: taskTitle, weight: taskWeight });
                setTaskTitle("");
            }
        }
    };

    return (
        <Box>
            <AppBar position="fixed" sx={{ display: { xs: "block", md: "block" }, zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <IconButton size="large" edge="start" color="inherit" aria-label="menu" sx={{ mr: 2, display: { xs: "block", md: "none" } }} onClick={() => setOpen(!open)}>
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" component="div">
                        VanishToDo
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box sx={{ display: "flex" }}>
                <Drawer
                    variant={"permanent"} // 常に表示
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
                    <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
                    <List>
                        <ListItem>
                            <ListItemButton component="a" href="/" selected>
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
                <Drawer
                    variant={"temporary"}
                    open={open}
                    onClose={() => setOpen(false)}
                    sx={{
                        display: { xs: "block", md: "none" }, // モバイルでは表示
                        width: 280,
                        "& .MuiDrawer-paper": {
                            // 内部要素のスタイル
                            width: 280,
                            boxSizing: "border-box",
                        },
                    }}
                >
                    <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
                    <List>
                        <ListItem>
                            <ListItemButton component="a" href="/" selected>
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

                <Box component="main" sx={{ flexGrow: 1 }}>
                    <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
                    <Box sx={{ display: "flex", padding: 2 }}>
                        <TextField
                            id="task-input"
                            label="新しいタスクを追加"
                            variant="outlined"
                            fullWidth
                            sx={{ margin: 1 }}
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    onAddTask();
                                }
                            }}
                        />
                        <Button variant="contained" sx={{ margin: 1, width: 120 }} onClick={onAddTask}>
                            <Typography variant="h6">追加</Typography>
                        </Button>
                    </Box>
                    <FormControl>
                        <FormLabel id="task-weight-label" sx={{ marginLeft: 2 }}>
                            タスクの重み
                        </FormLabel>
                        <RadioGroup
                            row
                            aria-labelledby="task-weight-label"
                            name="task-weight-group"
                            value={taskWeight}
                            onChange={(e) => setTaskWeight(v.parse(weightSchema, e.target.value))}
                            sx={{ marginLeft: 2, marginBottom: 2 }}
                        >
                            <FormControlLabel value={"light"} labelPlacement="end" control={<Radio />} label="軽" />
                            <FormControlLabel value={"medium"} labelPlacement="end" control={<Radio />} label="中" />
                            <FormControlLabel value={"heavy"} labelPlacement="end" control={<Radio />} label="重" />
                            <FormControlLabel value={"due-date"} labelPlacement="end" control={<Radio />} label="締切" />
                        </RadioGroup>
                    </FormControl>
                    <DatePicker
                        label="締切日"
                        sx={{ marginLeft: 2, marginBottom: 2 }}
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(dayjs(e))}
                        defaultValue={dayjs()}
                    />
                    <Grid container sx={{ padding: 2 }}>
                        {tasks.map((task) => (
                            <Grid size={{ xs: 12, lg: 6 }} key={task.meta.id} sx={{ padding: 1 }}>
                                <Paper sx={{ padding: 2 }} elevation={2}>
                                    <TextField
                                        variant="standard"
                                        fullWidth
                                        value={task.data.title}
                                        onChange={(e) => {
                                            const updatedItem = {
                                                ...task,
                                                data: { ...task.data, title: e.currentTarget.value },
                                            };
                                            handleEditTask(updatedItem);
                                        }}
                                    />
                                    <div className="task-create-date">{shortPastDate(task.meta.createdAt, current_date).date}作成</div>
                                    <TaskWeightBadge task={task} current_date={current_date} />
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Box>
        </Box>
    );
}
