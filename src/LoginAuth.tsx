import { Box, Toolbar } from "@mui/material";
import { useEffect, type JSX } from "react";
import { useNavigate, useSearchParams } from "react-router";

export function LoginAuth(): JSX.Element {
    const navigate = useNavigate();
    // const queryParams = new URLSearchParams(window.location.search);
    const [queryParams] = useSearchParams();
    const token = queryParams.get("token");

    // Here you would typically verify the token with the backend.
    // For simplicity, we will just navigate to the home page after "verification".
    useEffect(() => {
        async function verifyToken() {
            try {
                const response = await fetch("/api/v1/auth", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ token }),
                });

                if (response.ok) {
                    // Token is valid, navigate to home
                    navigate("/");
                } else {
                    // Token is invalid, navigate to login
                    navigate("/login");
                }
            } catch (error) {
                // In case of error, navigate to login
                navigate("/login");
            }
        }

        if (token) {
            verifyToken();
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
