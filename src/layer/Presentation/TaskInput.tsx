import { Box, Button, FormControl, FormControlLabel, Paper, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";
import * as v from "valibot";
import type { TaskCreate } from "../../../type/types";

export type TaskInputProps = {
    userId: string | undefined;
    handleAddTask: (data: TaskCreate) => void;
};

export const taskWeightSchema = v.picklist(["light", "medium", "heavy", "due-date"]);
export type TaskWeight = v.InferOutput<typeof taskWeightSchema>;

export function TaskInput({ userId, handleAddTask }: TaskInputProps): React.ReactElement {
    const [taskTitle, setTaskTitle] = useState("");
    const [taskWeight, setTaskWeight] = useState<TaskWeight>("light");
    const [taskDueDate, setTaskDueDate] = useState<Dayjs>(dayjs());

    const onAddTask = () => {
        if (taskTitle.trim()) {
            if (taskWeight === "due-date") {
                handleAddTask({ userId, title: taskTitle, dueDate: taskDueDate.toISOString() });
            } else {
                handleAddTask({ userId, title: taskTitle, weight: taskWeight });
            }
            setTaskTitle("");
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
                        name="task-weight-group"
                        value={taskWeight}
                        onChange={(e) => setTaskWeight(v.parse(taskWeightSchema, e.target.value))}
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
