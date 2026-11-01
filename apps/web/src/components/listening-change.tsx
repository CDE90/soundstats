import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import styles from "./music-collection.module.css";

export function ListeningChange({
    value,
    rank = false,
    previousRank,
    unit = "plays",
}: {
    value: number | null | undefined;
    rank?: boolean;
    previousRank?: number | null;
    unit?: string;
}) {
    if (value == null) return null;
    const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus;
    const label = rank
        ? value === 0
            ? "Same rank as previous period"
            : `Moved ${value > 0 ? "up" : "down"} ${Math.abs(value)} places${previousRank ? ` from ${previousRank}` : ""}`
        : value === 0
          ? `Same ${unit} as the previous period`
          : `${Math.abs(value).toFixed(1)}% ${value > 0 ? "more" : "less"} ${unit} than the previous period`;
    return (
        <span
            className={styles.change}
            role="img"
            data-direction={value > 0 ? "up" : value < 0 ? "down" : "same"}
            aria-label={label}
            title={label}
        >
            <Icon size={12} aria-hidden="true" />
            {rank
                ? value === 0
                    ? null
                    : Math.abs(value)
                : `${Math.abs(value).toFixed(1)}%`}
        </span>
    );
}
