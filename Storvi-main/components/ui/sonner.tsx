"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = "system" } = useTheme();

    return (
        <Sonner
            theme={theme as ToasterProps["theme"]}
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast: "group toast group-[.toaster]:border-light-300 group-[.toaster]:bg-white group-[.toaster]:text-dark-200 group-[.toaster]:shadow-lg",
                    error: "!border-transparent !bg-red !text-white [&_[data-description]]:!text-white [&_[data-icon]]:!text-white [&_[data-title]]:!text-white",
                    description: "group-[.toast]:text-light-100",
                    actionButton:
                        "group-[.toast]:bg-brand group-[.toast]:text-white",
                    cancelButton:
                        "group-[.toast]:bg-light-300 group-[.toast]:text-light-100",
                },
            }}
            {...props}
        />
    );
};

export { Toaster };
