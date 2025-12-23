import type { JSX } from "react";

export type BottomButtonsProps = {
    countSelected: number;
    handleRevertSelected: () => void;
};

export function BottomButtons({ countSelected, handleRevertSelected }: BottomButtonsProps): JSX.Element {
    return (
        <footer className="bottom-buttons">
            <div className="responsive-mobile">
                <div>
                    <span>{countSelected} 件選択中</span>
                </div>
                <div className="buttons">
                    <button className="revert" onClick={handleRevertSelected}>
                        一括復帰
                    </button>
                    <button className="delete">一括削除</button>
                </div>
            </div>
        </footer>
    );
}
