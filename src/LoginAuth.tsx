import { Box, Toolbar } from "@mui/material";
import { type JSX, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useBroker } from "./layer/Broker";

export function LoginAuth(): JSX.Element {
    const {
        broker: [pub, sub],
        isInitialized,
    } = useBroker();
    const navigate = useNavigate();
    const [queryParams] = useSearchParams();
    const token = queryParams.get("token");

    useEffect(() => {
        sub("auth-success", () => {
            navigate("/");
        });

        sub("notify-error", (packet) => {
            if (packet.error_info.code === "TOKEN_NOT_FOUND" || packet.error_info.code === "EXPIRED_TOKEN") {
                navigate("/login");
            }
        });
    }, []);

    useEffect(() => {
        if (!isInitialized) return;

        if (token) {
            pub("auth-token", { token });
        } else {
            navigate("/login");
        }
    }, [isInitialized, token, pub, navigate]);

    return (
        <Box component="main" sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
        </Box>
    );
}
