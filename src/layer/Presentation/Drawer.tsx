import type { JSX } from "react";

export function Drawer(): JSX.Element {
    return (
        <>
            <label htmlFor="menu-toggle" className="drawer-backdrop"></label>
            <aside className="drawer">
                <header className="drawer-title"></header>
                <menu className="drawer-menu">
                    <li className="drawer-menu-item">
                        <a href="/" className="drawer-menu-item-container">
                            <img src="asset/icon/house.svg" alt="menu" className="svg-icon" />
                            ホーム
                        </a>
                    </li>
                    <li className="drawer-menu-item">
                        <a href="/all" className="drawer-menu-item-container">
                            <img src="asset/icon/bars.svg" alt="menu" className="svg-icon" />
                            全タスク
                        </a>
                    </li>
                    <li className="drawer-menu-item">
                        <a href="/" className="drawer-menu-item-container">
                            <img src="asset/icon/circle-check.svg" alt="menu" className="svg-icon" />
                            完了タスク
                        </a>
                    </li>
                    <li className="drawer-menu-item">
                        <a href="/" className="drawer-menu-item-container">
                            <img src="asset/icon/gear.svg" alt="menu" className="svg-icon" />
                            設定
                        </a>
                    </li>
                </menu>
            </aside>
        </>
    );
}
