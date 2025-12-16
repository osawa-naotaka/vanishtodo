import type { JSX } from "react";

export function AppBar(): JSX.Element {
    return (
        <header className="app-bar">
            <div className="responsive">
                <button type="button" className="app-bar-menu-button">
                    <img src="asset/icon/bars.svg" alt="menu" className="icon" />
                </button>
                <h1 className="app-bar-title">VanishToDo</h1>
            </div>
        </header>
    );
}
