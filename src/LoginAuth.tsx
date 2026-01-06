import { Box, Toolbar } from "@mui/material";
import { useAtomValue, useSetAtom } from "jotai";
import type { JSX } from "react";
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { apiAuthSuccessSchema, apiTasksSchema, type TaskContent, type UserSetting, userSettingSchema } from "../type/types";
import { setting_config, task_config } from "./Home";
import { isLoginAtom, networkAtom, Persistent, userIdAtom } from "./layer/Jotai";
import { LocalStorage } from "./layer/Persistent";

export function LoginAuth(): JSX.Element {
    console.log("LoginAuth: render");
    const navigate = useNavigate();
    const [queryParams] = useSearchParams();
    const token = queryParams.get("token");
    const network = useAtomValue(networkAtom);
    const setIsLogin = useSetAtom(isLoginAtom);
    const setUserId = useSetAtom(userIdAtom);
    const per_tasks = useRef<Persistent<TaskContent>>(new Persistent<TaskContent>(task_config));
    const ls_settings = useRef<LocalStorage<UserSetting>>(new LocalStorage<UserSetting>(setting_config));

    useEffect(() => {
        console.log("LoginAuth: start authentication with token", token);
        async function authenticate() {
            const result = await network.postJson("/auth", { token }, apiAuthSuccessSchema);
            if (result.status === "success") {
                setIsLogin(true);
                setUserId(result.data.userId);
                const setting = await network.getJson(`/setting/${result.data.userId}`, userSettingSchema);
                if (setting.status === "success") {
                    console.log("LoginAuth: fetched user setting", setting.data);
                    ls_settings.current.item = setting.data;
                }
                const tasks = await network.getJson(`/tasks`, apiTasksSchema);
                if (tasks.status === "success") {
                    console.log("LoginAuth: fetched tasks", tasks.data);
                    per_tasks.current.items = tasks.data;
                }

                navigate("/");
            } else {
                console.error("LoginAuth: Authentication failed", result.error_info);
                navigate("/login");
            }
        }
        authenticate();
    }, [token]);

    return (
        <Box component="main" sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
        </Box>
    );
}
