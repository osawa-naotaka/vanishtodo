import ReactDOM from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { All } from "./All";
import { Home } from "./Home";
import "./index.css";

const router = createBrowserRouter([
    {
        path: "/",
        Component: Home,
    },
    {
        path: "/all",
        Component: All,
    },
]);

const root = document.getElementById("root");
if (root === null) {
    throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(<RouterProvider router={router} />);
