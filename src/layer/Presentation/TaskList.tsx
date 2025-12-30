import { Box, Checkbox, Grid, Paper, Typography } from "@mui/material";
import { shortPastDate } from "../../lib/date";
import type { SelectableTask } from "./ContextProvider";
import { TaskWeightBadge } from "./TaskWeightBadge";

type TaskListProps = {
    tasks: SelectableTask[];
    current_date: string;
    onSelectTask: (task: SelectableTask, isSelected: boolean) => void;
};

export function TaskList({ tasks, current_date, onSelectTask }: TaskListProps): React.ReactElement {
    return (
        <Grid container sx={{ padding: 2 }}>
            {tasks.map((task) => (
                <Grid size={{ xs: 12, lg: 6 }} key={task.task.meta.id} sx={{ padding: 1 }}>
                    <Paper sx={{ padding: 2, display: "flex" }} elevation={2}>
                        <Checkbox checked={task.isSelected} size="large" onChange={(e) => onSelectTask(task, e.target.checked)} />
                        <Box sx={{ flexGrow: 1, marginLeft: 2 }}>
                            {task.task.data.completedAt ? (
                                <Typography variant="h6" sx={{ textDecoration: "line-through", color: "gray" }}>
                                    {task.task.data.title}
                                </Typography>
                            ) : task.task.data.isDeleted ? (
                                <Typography variant="h6" sx={{ textDecoration: "line-through", color: "lightgray" }}>
                                    {task.task.data.title}
                                </Typography>
                            ) : (
                                <Typography variant="h6">{task.task.data.title}</Typography>
                            )}
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
