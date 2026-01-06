import { CssBaseline, createTheme, ThemeProvider } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type React from "react";
import { useEffect } from "react";
import { Outlet } from "react-router";
import { useTaskStore } from "../../store/useTaskStore";

const theme = createTheme({
    // palette: {
    //     primary: {
    //         main: "#3F51B5", // VanishToDoのメインカラー
    //         light: "#5C6BC0",
    //         dark: "#303F9F",
    //     },
    //     secondary: {
    //         main: "#FF9800", // 中タスクの色
    //     },
    // },
    // typography: {
    //     fontFamily: 'Roboto, "Noto Sans JP", sans-serif',
    //     h5: {
    //         fontWeight: 500,
    //     },
    // },
    // spacing: 8, // 1単位 = 8px（sx={{mt: 2}} = margin-top: 16px）
});

export function BaseLayout(): React.ReactElement {
    const loadFromLocalStorage = useTaskStore((state) => state.loadFromLocalStorage);

    // アプリ起動時にLocalStorageから読み込み（一度だけ）
    useEffect(() => {
        loadFromLocalStorage();
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Outlet />
            </LocalizationProvider>
        </ThemeProvider>
    );
}
