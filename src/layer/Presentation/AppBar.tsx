import type { JSX } from "react";

export function AppBar(): JSX.Element {
    return (
        <header className="app-bar">
            <div className="responsive">
                <input type="checkbox" name="menu-toggle" id="menu-toggle" />
                <label htmlFor="menu-toggle" className="app-bar-menu-button">
                    <img src="asset/icon/bars.svg" alt="menu" className="app-bar-menu-icon" />
                </label>
                <h1 className="app-bar-title">VanishToDo</h1>
            </div>
        </header>
    );
}
