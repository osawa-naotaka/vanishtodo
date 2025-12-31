import { Box, Button, Toolbar, Typography } from "@mui/material";
import { Email as EmailIcon } from "@mui/icons-material";
import type { JSX } from "react";
import { useNavigate } from "react-router";

export function LoginSent(): JSX.Element {
    const navigate = useNavigate();

    return (
        <Box component="main" sx={{ flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
            <Toolbar /> {/* AppBarと同じ高さのスペーサー */}
            <Box sx={{ maxWidth: 500, width: "100%", p: 3, textAlign: "center" }}>
                <EmailIcon sx={{ fontSize: 80, color: "primary.main", mb: 3 }} />

                <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
                    メールを送信しました
                </Typography>

                <Typography variant="body1" sx={{ mb: 2 }}>
                    ご登録のメールアドレスにログインリンクを送信しました。
                </Typography>

                <Typography variant="body1" sx={{ mb: 4 }}>
                    メール内のリンクをクリックしてログインを完了してください。
                    <br />
                    リンクの有効期限は15分です。
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    メールが届かない場合は、迷惑メールフォルダをご確認ください。
                </Typography>

                <Button
                    variant="outlined"
                    onClick={() => navigate("/login")}
                    sx={{ mt: 2 }}
                >
                    ログイン画面に戻る
                </Button>
            </Box>
        </Box>
    );
}
