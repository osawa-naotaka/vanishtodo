import { Box, Grid, Paper, Typography } from "@mui/material";
import type { Tasks } from "../../../type/types";
import { shortPastDate } from "../../lib/date";
import { TaskWeightBadge } from "./TaskWeightBadge";

type TaskListProps = {
    tasks: Tasks;
    current_date: string;
};

export function TaskList({ tasks, current_date }: TaskListProps): React.ReactElement {
    return (
        <Grid container sx={{ padding: 2 }}>
            {tasks.map((task) => (
                <Grid size={{ xs: 12, lg: 6 }} key={task.meta.id} sx={{ padding: 1 }}>
                    <Paper sx={{ padding: 2, display: "flex" }} elevation={2}>
                        <Box sx={{ flexGrow: 1, marginLeft: 2 }}>
                            <Typography variant="h6">{task.data.title}</Typography>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div className="task-create-date">{shortPastDate(task.meta.createdAt, current_date).date}作成</div>
                                <TaskWeightBadge task={task} current_date={current_date} />
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            ))}
        </Grid>
    );
}
