import type { JSX } from "react";

export function Drawer(): JSX.Element {
    return (
        <>
            <label htmlFor="menu-toggle" className="drawer-backdrop"></label>
            <aside className="drawer">
                <header className="drawer-title"></header>
                <menu className="drawer-menu">
                    <li className="drawer-menu-item">
                        <a href="/">ホーム</a>
                    </li>
                    <li className="drawer-menu-item">
                        <a href="/all">全タスク</a>
                    </li>
                    <li className="drawer-menu-item">
                        <a href="/completed">完了タスク</a>
                    </li>
                    <hr />
                    <li className="drawer-menu-item">
                        <a href="/settings">設定</a>
                    </li>
                </menu>
            </aside>
        </>
    );
}
