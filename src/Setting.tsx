import { Box, Divider, Paper, Slider, Toolbar, Typography } from "@mui/material";
import type { JSX } from "react";
import { BaseLayout } from "./layer/Presentation/BaseLayout";
import { useUserSetting } from "./layer/Presentation/CustomeHook"

export function Setting(): JSX.Element {
    const { setting } = useUserSetting();

    const user_setting = setting.length > 0 ? setting[0].data : {
        timezone: 9,
        dailyGoals: {
            heavy: 1,
            medium: 2,
            light: 3,
        },
    };

    return (
        <BaseLayout selected="setting">
            <Box component="main" sx={{ flexGrow: 1 }}>
                <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
                <Typography variant="h4" sx={{ margin: 2 }}>
                    日次目標設定
                </Typography>
                <Typography sx={{ margin: 2 }}>
                    1日に完了したいタスクの数を設定します。
                </Typography>
                <Paper sx={{ margin: 2, padding: 2 }}>
                    <Typography variant="h5">軽いタスク</Typography>
                    <Typography>15分以内で完了するタスク</Typography>
                    <Slider value={user_setting.dailyGoals.light} min={0} max={20} step={1} marks />
                    <Divider sx={{ marginY: 2 }} />
                    <Typography variant="h5">中タスク</Typography>
                    <Typography>15分〜60分で完了するタスク</Typography>
                    <Slider value={user_setting.dailyGoals.medium} min={0} max={20} step={1} marks />
                    <Divider sx={{ marginY: 2 }} />
                    <Typography variant="h5">重いタスク</Typography>
                    <Typography>60分以上かかるタスク</Typography>
                    <Slider value={user_setting.dailyGoals.heavy} min={0} max={20} step={1} marks />
                </Paper>
            </Box>
        </BaseLayout>
    );
}
