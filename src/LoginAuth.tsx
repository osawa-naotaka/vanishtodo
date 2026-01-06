import { Box, Toolbar } from "@mui/material";
import { useEffect, type JSX } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTaskStore } from "./store/useTaskStore";

export function LoginAuth(): JSX.Element {
    const navigate = useNavigate();
    const [queryParams] = useSearchParams();
    const token = queryParams.get("token");
    const authToken = useTaskStore((state) => state.authToken);

    useEffect(() => {
        const authenticate = async () => {
            if (token) {
                const userId = await authToken(token);
                if (userId) {
                    // 認証成功 - DBとの同期はauthToken内で実行済み
                    navigate("/");
                } else {
                    // 認証失敗
                    navigate("/login");
                }
            } else {
                navigate("/login");
            }
        };

        authenticate();
    }, [token, authToken, navigate]);

    return (
        <Box component="main" sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
        </Box>
    );
}
