import { Delete, FormatListBulleted, Home, Settings, TaskAlt } from "@mui/icons-material";
import { Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import type { JSX } from "react";

export type DrawerContentProps = {
    selected: "home" | "all" | "completed" | "deleted" | "settings";
};

export function DrawerContent({ selected }: DrawerContentProps): JSX.Element {
    return (
        <List>
            <ListItem>
                <ListItemButton component="a" href="/" selected={selected === "home"}>
                    <ListItemIcon>
                        <Home />
                    </ListItemIcon>
                    <ListItemText primary="ホーム" />
                </ListItemButton>
            </ListItem>
            <ListItem>
                <ListItemButton component="a" href="/all" selected={selected === "all"}>
                    <ListItemIcon>
                        <FormatListBulleted />
                    </ListItemIcon>
                    <ListItemText primary="すべてのタスク" />
                </ListItemButton>
            </ListItem>
            <ListItem>
                <ListItemButton component="a" href="/completed" selected={selected === "completed"}>
                    <ListItemIcon>
                        <TaskAlt />
                    </ListItemIcon>
                    <ListItemText primary="完了したタスク" />
                </ListItemButton>
            </ListItem>
            <ListItem>
                <ListItemButton component="a" href="/deleted" selected={selected === "deleted"}>
                    <ListItemIcon>
                        <Delete />
                    </ListItemIcon>
                    <ListItemText primary="削除したタスク" />
                </ListItemButton>
            </ListItem>
            <Divider />
            <ListItem>
                <ListItemButton component="a" href="/settings" selected={selected === "settings"}>
                    <ListItemIcon>
                        <Settings />
                    </ListItemIcon>
                    <ListItemText primary="設定" />
                </ListItemButton>
            </ListItem>
        </List>
    );
}
