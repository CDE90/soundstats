// Tremor Calendar [v0.1.0]

"use client";

import {
    RiArrowLeftDoubleLine,
    RiArrowLeftSLine,
    RiArrowRightDoubleLine,
    RiArrowRightSLine,
} from "@remixicon/react";
import { addYears, format, type Locale } from "date-fns";
import * as React from "react";
import {
    DayPicker,
    useDayPicker,
    type DayButtonProps,
    type Matcher,
    type MonthCaptionProps,
    type PropsBase,
    type PropsRange,
    type PropsSingle,
} from "react-day-picker";

import { cx, focusRing } from "@/lib/utils";

interface NavigationButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
    onClick: () => void;
    icon: React.ElementType;
    disabled?: boolean;
}

const NavigationButton = React.forwardRef<
    HTMLButtonElement,
    NavigationButtonProps
>(
    (
        { onClick, icon, disabled, ...props }: NavigationButtonProps,
        forwardedRef,
    ) => {
        const Icon = icon;
        return (
            <button
                ref={forwardedRef}
                type="button"
                disabled={disabled}
                className={cx(
                    "flex size-8 shrink-0 select-none items-center justify-center rounded border p-1 outline-none transition sm:size-[30px]",
                    // text color
                    "text-muted-foreground hover:text-foreground",
                    // border color
                    "border-border",
                    // background color
                    "hover:bg-muted active:bg-muted",
                    // disabled
                    "disabled:pointer-events-none",
                    "disabled:border-muted disabled:text-muted-foreground/50",
                    focusRing,
                )}
                onClick={onClick}
                {...props}
            >
                <Icon className="size-full shrink-0" />
            </button>
        );
    },
);

NavigationButton.displayName = "NavigationButton";

type KeysToOmit = "showWeekNumber" | "captionLayout" | "mode";

type SingleProps = Omit<PropsBase, KeysToOmit | "required"> &
    Omit<PropsSingle, "mode" | "required"> & {
        required?: boolean;
    };
type RangeProps = Omit<PropsBase, KeysToOmit | "required"> &
    Omit<PropsRange, "mode" | "required"> & {
        required?: boolean;
    };

type CalendarProps =
    | ({
          mode: "single";
      } & SingleProps)
    | ({
          mode?: undefined;
      } & SingleProps)
    | ({
          mode: "range";
      } & RangeProps);

const CompatibleDayPicker = DayPicker as React.ComponentType<
    SingleProps & RangeProps & { mode: "single" | "range" }
>;

const Calendar = ({
    mode = "single",
    weekStartsOn = 1,
    numberOfMonths = 1,
    enableYearNavigation = false,
    disableNavigation,
    locale,
    className,
    classNames,
    ...props
}: CalendarProps & { enableYearNavigation?: boolean }) => {
    return (
        <CompatibleDayPicker
            mode={mode}
            weekStartsOn={weekStartsOn}
            numberOfMonths={numberOfMonths}
            locale={locale}
            hideNavigation
            showOutsideDays={numberOfMonths === 1}
            className={cx(className)}
            classNames={{
                months: "flex space-y-0",
                month: "space-y-4 p-3",
                month_grid: "w-full border-collapse space-y-1",
                weekday:
                    "w-9 font-medium text-sm sm:text-xs text-center text-muted-foreground pb-2",
                week: "w-full mt-0.5",
                day: cx(
                    "relative p-0 text-center focus-within:relative",
                    "text-foreground",
                ),
                day_button: cx(
                    "size-9 rounded text-sm focus:z-10",
                    "text-foreground",
                    "hover:bg-muted",
                    focusRing,
                ),
                today: "font-semibold",
                selected: cx(
                    "rounded bg-primary",
                    "[&>button]:text-primary-foreground",
                ),
                disabled:
                    "!text-muted-foreground/30 line-through disabled:hover:bg-transparent",
                outside: "text-muted-foreground/50",
                range_middle: cx(
                    "!rounded-none !bg-primary/10",
                    "[&>button]:!text-foreground",
                ),
                range_start: "rounded-r-none !rounded-l",
                range_end: "rounded-l-none !rounded-r",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                MonthCaption: ({
                    calendarMonth,
                    displayIndex,
                    className: captionClassName,
                    ...captionProps
                }: MonthCaptionProps) => {
                    const {
                        goToMonth,
                        nextMonth,
                        previousMonth,
                        months,
                        dayPickerProps,
                    } = useDayPicker();
                    const currentMonth = calendarMonth.date;
                    const displayedMonthCount =
                        dayPickerProps.numberOfMonths ?? 1;
                    const startMonth =
                        dayPickerProps.startMonth ?? dayPickerProps.fromDate;
                    const endMonth =
                        dayPickerProps.endMonth ?? dayPickerProps.toDate;
                    const isFirst = displayIndex === 0;
                    const isLast = displayIndex === months.length - 1;

                    const hideNextButton =
                        displayedMonthCount > 1 && (isFirst || !isLast);
                    const hidePreviousButton =
                        displayedMonthCount > 1 && (isLast || !isFirst);

                    const goToPreviousYear = () => {
                        const targetMonth = addYears(currentMonth, -1);
                        if (
                            previousMonth &&
                            (!startMonth ||
                                targetMonth.getTime() >= startMonth.getTime())
                        ) {
                            goToMonth(targetMonth);
                        }
                    };

                    const goToNextYear = () => {
                        const targetMonth = addYears(currentMonth, 1);
                        if (
                            nextMonth &&
                            (!endMonth ||
                                targetMonth.getTime() <= endMonth.getTime())
                        ) {
                            goToMonth(targetMonth);
                        }
                    };

                    return (
                        <div
                            {...captionProps}
                            className={cx(
                                "flex items-center justify-between",
                                captionClassName,
                            )}
                        >
                            <div className="flex items-center gap-1">
                                {enableYearNavigation &&
                                    !hidePreviousButton && (
                                        <NavigationButton
                                            disabled={
                                                disableNavigation ||
                                                !previousMonth ||
                                                (startMonth &&
                                                    addYears(
                                                        currentMonth,
                                                        -1,
                                                    ).getTime() <
                                                        startMonth.getTime())
                                            }
                                            aria-label="Go to previous year"
                                            onClick={goToPreviousYear}
                                            icon={RiArrowLeftDoubleLine}
                                        />
                                    )}
                                {!hidePreviousButton && (
                                    <NavigationButton
                                        disabled={
                                            disableNavigation || !previousMonth
                                        }
                                        aria-label="Go to previous month"
                                        onClick={() =>
                                            previousMonth &&
                                            goToMonth(previousMonth)
                                        }
                                        icon={RiArrowLeftSLine}
                                    />
                                )}
                            </div>

                            <div
                                role="presentation"
                                aria-live="polite"
                                className="text-sm font-medium capitalize tabular-nums text-foreground"
                            >
                                {format(currentMonth, "LLLL yyy", {
                                    locale: locale as Locale | undefined,
                                })}
                            </div>

                            <div className="flex items-center gap-1">
                                {!hideNextButton && (
                                    <NavigationButton
                                        disabled={
                                            disableNavigation || !nextMonth
                                        }
                                        aria-label="Go to next month"
                                        onClick={() =>
                                            nextMonth && goToMonth(nextMonth)
                                        }
                                        icon={RiArrowRightSLine}
                                    />
                                )}
                                {enableYearNavigation && !hideNextButton && (
                                    <NavigationButton
                                        disabled={
                                            disableNavigation ||
                                            !nextMonth ||
                                            (endMonth &&
                                                addYears(
                                                    currentMonth,
                                                    1,
                                                ).getTime() >
                                                    endMonth.getTime())
                                        }
                                        aria-label="Go to next year"
                                        onClick={goToNextYear}
                                        icon={RiArrowRightDoubleLine}
                                    />
                                )}
                            </div>
                        </div>
                    );
                },
                DayButton: ({
                    modifiers,
                    children,
                    className: buttonClassName,
                    ...buttonProps
                }: DayButtonProps) => {
                    const buttonRef = React.useRef<HTMLButtonElement>(null);
                    const { selected, today, disabled, range_middle } =
                        modifiers;

                    return (
                        <button
                            ref={buttonRef}
                            {...buttonProps}
                            type="button"
                            className={cx("relative", buttonClassName)}
                        >
                            {children}
                            {today && (
                                <span
                                    className={cx(
                                        "absolute inset-x-1/2 bottom-1.5 h-0.5 w-4 -translate-x-1/2 rounded-[2px]",
                                        {
                                            "bg-primary": !selected,
                                            "!bg-primary-foreground": selected,
                                            "!bg-accent-foreground":
                                                selected && range_middle,
                                            "bg-muted-foreground": disabled,
                                        },
                                    )}
                                />
                            )}
                        </button>
                    );
                },
            }}
            tremor-id="tremor-raw"
            {...(props as SingleProps & RangeProps)}
        />
    );
};

Calendar.displayName = "Calendar";

export { Calendar, type Matcher };
