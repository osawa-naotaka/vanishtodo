import { CssBaseline, createTheme, ThemeProvider } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import ReactDOM from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { Completed } from "./Completed";
import { Deleted } from "./Deleted";
import { Home } from "./Home";

const router = createBrowserRouter([
    {
        path: "/",
        Component: Home,
    },
    {
        path: "/completed",
        Component: Completed,
    },
    {
        path: "/deleted",
        Component: Deleted,
    },
]);

const root = document.getElementById("root");
if (root === null) {
    throw new Error("Root element not found");
}

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

ReactDOM.createRoot(root).render(
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <RouterProvider router={router} />
        </LocalizationProvider>
    </ThemeProvider>,
);
