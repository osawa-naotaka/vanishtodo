import { CheckBoxOutlineBlank } from "@mui/icons-material";
import { Box, Grid, IconButton, Paper, TextField, Tooltip } from "@mui/material";
import { shortPastDate } from "../../lib/date";
import type { SelectableTask } from "./ContextProvider";
import { TaskWeightBadge } from "./TaskWeightBadge";

type EditableTaskListProps = {
    tasks: SelectableTask[];
    current_date: string;
    onEditTask: (task: SelectableTask) => void;
    onCompleteTask: (task: SelectableTask) => void;
};

export function EditableTaskList({ tasks, current_date, onEditTask, onCompleteTask }: EditableTaskListProps): React.ReactElement {
    return (
        <Grid container sx={{ padding: 2 }}>
            {tasks.map((task) => (
                <Grid size={{ xs: 12, lg: 6 }} key={task.task.meta.id} sx={{ padding: 1 }}>
                    <Paper sx={{ padding: 2, display: "flex" }} elevation={2}>
                        <Tooltip title="タスクを完了にする">
                            <IconButton
                                aria-label="complete task"
                                sx={{ paddingInline: 2 }}
                                onClick={() => {
                                    onCompleteTask(task);
                                }}
                            >
                                <CheckBoxOutlineBlank />
                            </IconButton>
                        </Tooltip>
                        <Box sx={{ flexGrow: 1, marginLeft: 2 }}>
                            <TextField
                                variant="standard"
                                fullWidth
                                value={task.task.data.title}
                                onChange={(e) => {
                                    const updatedItem = {
                                        ...task,
                                        data: { ...task.task.data, title: e.currentTarget.value },
                                    };
                                    onEditTask(updatedItem);
                                }}
                            />
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div className="task-create-date">{shortPastDate(task.task.meta.createdAt, current_date).date}作成</div>
                                <TaskWeightBadge task={task.task} current_date={current_date} />
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            ))}
        </Grid>
    );
}
