import { Menu as MenuIcon } from "@mui/icons-material";
import { AppBar, Avatar, Box, Drawer, IconButton, Toolbar, Typography } from "@mui/material";
import type React from "react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { DrawerContent } from "./DrawerContent";

export function AppLayout(): React.ReactElement {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <>
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
                            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                                VanishToDo
                            </Typography>
                            <IconButton size="large" edge="end" color="inherit" aria-label="account" onClick={() => navigate("/login")}>
                                <Avatar sx={{ width: 32, height: 32 }} />
                            </IconButton>
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
        </>
    );
}
