import { Box, Divider, Paper, Slider, Toolbar, Typography } from "@mui/material";
import type { JSX } from "react";
import { useTaskStore } from "./store/useTaskStore";

export function Setting(): JSX.Element {
    const { userSetting, editUserSetting } = useTaskStore();

    return (
        <Box component="main" sx={{ flexGrow: 1 }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
            <Typography variant="h4" sx={{ margin: 2 }}>
                日次目標設定
            </Typography>
            <Typography sx={{ margin: 2 }}>1日に完了したいタスクの数を設定します。</Typography>
            <Paper sx={{ margin: 2, padding: 2 }}>
                <Typography variant="h5">軽いタスク</Typography>
                <Typography>15分以内で完了するタスク</Typography>
                <Slider
                    value={userSetting.data.dailyGoals.light}
                    min={0}
                    max={10}
                    step={1}
                    marks
                    onChange={(_e, value) =>
                        editUserSetting({
                            meta: userSetting.meta,
                            data: {
                                email: userSetting.data.email,
                                timezone: userSetting.data.timezone,
                                dailyGoals: {
                                    light: value as number,
                                    medium: userSetting.data.dailyGoals.medium,
                                    heavy: userSetting.data.dailyGoals.heavy,
                                },
                            },
                        })
                    }
                />
                <Divider sx={{ marginY: 2 }} />
                <Typography variant="h5">中タスク</Typography>
                <Typography>15分〜60分で完了するタスク</Typography>
                <Slider
                    value={userSetting.data.dailyGoals.medium}
                    min={0}
                    max={10}
                    step={1}
                    marks
                    onChange={(_e, value) =>
                        editUserSetting({
                            meta: userSetting.meta,
                            data: {
                                email: userSetting.data.email,
                                timezone: userSetting.data.timezone,
                                dailyGoals: {
                                    light: userSetting.data.dailyGoals.light,
                                    medium: value as number,
                                    heavy: userSetting.data.dailyGoals.heavy,
                                },
                            },
                        })
                    }
                />
                <Divider sx={{ marginY: 2 }} />
                <Typography variant="h5">重いタスク</Typography>
                <Typography>60分以上かかるタスク</Typography>
                <Slider
                    value={userSetting.data.dailyGoals.heavy}
                    min={0}
                    max={10}
                    step={1}
                    marks
                    onChange={(_e, value) =>
                        editUserSetting({
                            meta: userSetting.meta,
                            data: {
                                email: userSetting.data.email,
                                timezone: userSetting.data.timezone,
                                dailyGoals: {
                                    light: userSetting.data.dailyGoals.light,
                                    medium: userSetting.data.dailyGoals.medium,
                                    heavy: value as number,
                                },
                            },
                        })
                    }
                />
            </Paper>
        </Box>
    );
}
