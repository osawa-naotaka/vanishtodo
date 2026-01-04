import { Box, Toolbar } from "@mui/material";
import type { JSX } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useBiz } from "./layer/Presentation/ContextProvider";

export function LoginAuth(): JSX.Element {
    const navigate = useNavigate();
    const {
        auth: { auth },
    } = useBiz();
    const [queryParams] = useSearchParams();
    const token = queryParams.get("token");

    async function verifyToken() {
        if (token) {
            await auth(token);
            navigate("/");
        }
        navigate("/login");
    }

    if (token) {
        verifyToken();
    } else {
        navigate("/login");
    }

    return (
        <Box component="main" sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
        </Box>
    );
}
