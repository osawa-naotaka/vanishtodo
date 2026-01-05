import { Alert, Box, Button, TextField, Toolbar, Typography } from "@mui/material";
import type { JSX } from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useBroker } from "./layer/Broker";

export function Login(): JSX.Element {
    const { broker } = useBroker();
    const [email, setEmail] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            broker.publish("request-login", { email });

            // レスポンスの成功・失敗に関わらず送信完了ページに遷移
            navigate("/login/sent");
        } catch (_err) {
            // ネットワークエラーなどの場合も送信完了ページに遷移
            navigate("/login/sent");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box component="main" sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
            <Box sx={{ maxWidth: 400, width: "100%", p: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: "center", mb: 4 }}>
                    VanishToDo ログイン
                </Typography>

                <Typography variant="body1" sx={{ mb: 3, textAlign: "center" }}>
                    メールアドレスを入力してください。
                    <br />
                    マジックリンクをお送りします。
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        type="email"
                        label="メールアドレス"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isSubmitting}
                        sx={{ mb: 3 }}
                        autoComplete="email"
                        autoFocus
                    />

                    <Button fullWidth type="submit" variant="contained" size="large" disabled={isSubmitting || !email} sx={{ mb: 2 }}>
                        {isSubmitting ? "送信中..." : "ログインリンクを送信"}
                    </Button>
                </form>
            </Box>
        </Box>
    );
}
