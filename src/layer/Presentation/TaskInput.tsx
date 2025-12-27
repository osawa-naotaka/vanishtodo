import { Box, Button, FormControl, FormControlLabel, Paper, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";
import * as v from "valibot";

export type TaskInputProps = {
    handleAddTask: (data: { title: string; weight?: "light" | "medium" | "heavy"; dueDate?: string }) => void;
};

const weightSchema = v.picklist(["light", "medium", "heavy", "due-date"]);

export function TaskInput({ handleAddTask }: TaskInputProps): React.ReactElement {
    const [taskTitle, setTaskTitle] = useState("");
    const [taskWeight, setTaskWeight] = useState<Weight>("light");
    const [taskDueDate, setTaskDueDate] = useState<Dayjs>();
    type Weight = "light" | "medium" | "heavy" | "due-date";

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
        <Paper elevation={2} sx={{ margin: 3, padding: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            <TextField
                id="task-input"
                label="新しいタスクを追加"
                variant="outlined"
                fullWidth
                sx={{ margin: 1, paddingRight: 2 }}
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        onAddTask();
                    }
                }}
            />
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                <Button variant="contained" sx={{ marginBlock: 2, marginInline: 1, width: 120 }} onClick={onAddTask}>
                    <Typography variant="h6">追加</Typography>
                </Button>
                <FormControl>
                    <RadioGroup
                        row
                        aria-labelledby="task-weight-label"
                        name="task-weight-group"
                        value={taskWeight}
                        onChange={(e) => setTaskWeight(v.parse(weightSchema, e.target.value))}
                        sx={{ marginBlock: 2, marginInline: 1 }}
                    >
                        <FormControlLabel value={"light"} control={<Radio />} label="軽" />
                        <FormControlLabel value={"medium"} control={<Radio />} label="中" />
                        <FormControlLabel value={"heavy"} control={<Radio />} label="重" />
                        <FormControlLabel value={"due-date"} control={<Radio />} label="締切" />
                    </RadioGroup>
                </FormControl>
                <DatePicker
                    label="締切日"
                    sx={{ marginBlock: 2, marginInline: 1 }}
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(dayjs(e))}
                    defaultValue={dayjs()}
                />
            </Box>
        </Paper>
    );
}
