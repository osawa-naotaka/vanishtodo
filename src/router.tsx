import ReactDOM from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { All } from "./All";
import { Completed } from "./Completed";
import { Deleted } from "./Deleted";
import { Home } from "./Home";
import { Login } from "./Login";
import { LoginAuth } from "./LoginAuth";
import { LoginSent } from "./LoginSent";
import { AppLayout } from "./layer/Presentation/AppLayout";
import { LoginLayout } from "./layer/Presentation/LoginLayout";
import { Setting } from "./Setting";

const router = createBrowserRouter([
    {
        element: <LoginLayout />,
        children: [
            {
                path: "/login",
                Component: Login,
            },
            {
                path: "/login/sent",
                Component: LoginSent,
            },
            {
                path: "/login/auth",
                Component: LoginAuth,
            },
            {
                element: <AppLayout />,
                children: [
                    {
                        path: "/",
                        Component: Home,
                    },
                    {
                        path: "/all",
                        Component: All,
                    },
                    {
                        path: "/completed",
                        Component: Completed,
                    },
                    {
                        path: "/deleted",
                        Component: Deleted,
                    },
                    {
                        path: "/setting",
                        Component: Setting,
                    },
                ],
            },
        ],
    },
]);

const root = document.getElementById("root");
if (root === null) {
    throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(<RouterProvider router={router} />);
