import { Box, Toolbar } from "@mui/material";
import { type JSX, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useBiz } from "./layer/Presentation/ContextProvider";

export function LoginAuth(): JSX.Element {
    const navigate = useNavigate();
    const {
        auth: { auth },
    } = useBiz();
    const [queryParams] = useSearchParams();
    const token = queryParams.get("token");

    useEffect(() => {
        if (token) {
            auth(token, () => {
                navigate("/");
            });
        }
    }, [token]);

    return (
        <Box component="main" sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
        </Box>
    );
}
