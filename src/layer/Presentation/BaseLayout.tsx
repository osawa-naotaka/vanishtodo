import { Menu as MenuIcon } from "@mui/icons-material";
import { AppBar, Box, Drawer, IconButton, Toolbar, Typography } from "@mui/material";
import type React from "react";
import { useState } from "react";
import { DrawerContent, type DrawerContentProps } from "./DrawerContent";

export function BaseLayout({ selected, children }: { selected: DrawerContentProps["selected"]; children: React.ReactNode }): React.ReactElement {
    const [open, setOpen] = useState(false);

    return (
        <Box>
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
                    <DrawerContent selected={selected} />
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
                    <DrawerContent selected={selected} />
                </Drawer>
                {children}
            </Box>
        </Box>
    );
}
