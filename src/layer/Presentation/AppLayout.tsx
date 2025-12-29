import { Menu as MenuIcon } from "@mui/icons-material";
import { AppBar, Box, CssBaseline, createTheme, Drawer, IconButton, ThemeProvider, Toolbar, Typography } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type React from "react";
import { useState } from "react";
import { Outlet } from "react-router";
import { DrawerContent } from "./DrawerContent";

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

export function AppLayout(): React.ReactElement {
    const [open, setOpen] = useState(false);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <AppBar position="fixed" sx={{ display: { xs: "block", md: "block" }, zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                    <Toolbar>
                        <IconButton
                            size="large"
                            edge="start"
                            color="inherit"
                            aria-label="menu"
                            sx={{ mr: 2, display: { xs: "block", md: "none" } }}
                            onClick={() => setOpen(!open)}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography variant="h6" component="div">
                            VanishToDo
                        </Typography>
                    </Toolbar>
                </AppBar>
                <Box sx={{ display: "flex" }}>
                    <Drawer
                        variant={"permanent"} // 常に表示
                        sx={{
                            display: { xs: "none", md: "block" }, // モバイルでは非表示
                            width: 280,
                            "& .MuiDrawer-paper": {
                                // 内部要素のスタイル
                                width: 280,
                                boxSizing: "border-box",
                            },
                        }}
                    >
                        <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
                        <DrawerContent />
                    </Drawer>
                    <Drawer
                        variant={"temporary"}
                        open={open}
                        onClose={() => setOpen(false)}
                        sx={{
                            display: { xs: "block", md: "none" }, // モバイルでは表示
                            width: 280,
                            "& .MuiDrawer-paper": {
                                // 内部要素のスタイル
                                width: 280,
                                boxSizing: "border-box",
                            },
                        }}
                    >
                        <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
                        <DrawerContent />
                    </Drawer>
                    <Outlet />
                </Box>
            </LocalizationProvider>
        </ThemeProvider>
    );
}
