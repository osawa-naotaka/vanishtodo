import { Box, Toolbar } from "@mui/material";
import { useEffect, type JSX } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useBroker } from "./layer/Broker";

export function LoginAuth(): JSX.Element {
    const { broker } = useBroker();
    const navigate = useNavigate();
    const [queryParams] = useSearchParams();
    const token = queryParams.get("token");

    broker.subscribe("auth-success", () => {
        navigate("/");
    });

    broker.subscribe("notify-error", (_broker, packet) => {
        if (packet.error_info.code === "TOKEN_NOT_FOUND" || packet.error_info.code === "EXPIRED_TOKEN") {
            navigate("/login");
        }
    });

    useEffect(() => {
        if (token) {
            broker.publish("auth-token", { token });
        } else {
            navigate("/login");
        }
    }, []);

    return (
        <Box component="main" sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
        </Box>
    );
}
