import { Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { BaseLayout } from "./layer/Presentation/BaseLayout";

export function Setting(): JSX.Element {
    return (
        <BaseLayout selected="setting">
            <Box component="main" sx={{ flexGrow: 1 }}>
                <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
            </Box>
        </BaseLayout>
    );
}
