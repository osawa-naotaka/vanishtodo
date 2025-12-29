import { Delete, Home, Settings, TaskAlt } from "@mui/icons-material";
import { Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import type { JSX } from "react";
import { NavLink } from "react-router";

export function DrawerContent(): JSX.Element {
    return (
        <List>
            <ListItem>
                <ListItemButton component={NavLink} to="/">
                    <ListItemIcon>
                        <Home />
                    </ListItemIcon>
                    <ListItemText primary="ホーム" />
                </ListItemButton>
            </ListItem>
            <ListItem>
                <ListItemButton component={NavLink} to="/completed">
                    <ListItemIcon>
                        <TaskAlt />
                    </ListItemIcon>
                    <ListItemText primary="完了したタスク" />
                </ListItemButton>
            </ListItem>
            <ListItem>
                <ListItemButton component={NavLink} to="/deleted">
                    <ListItemIcon>
                        <Delete />
                    </ListItemIcon>
                    <ListItemText primary="削除したタスク" />
                </ListItemButton>
            </ListItem>
            <Divider />
            <ListItem>
                <ListItemButton component={NavLink} to="/setting">
                    <ListItemIcon>
                        <Settings />
                    </ListItemIcon>
                    <ListItemText primary="設定" />
                </ListItemButton>
            </ListItem>
        </List>
    );
}
