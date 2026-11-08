"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Crown } from "lucide-react"

import { cn } from "@/lib/utils"

interface LeaderboardRanking {
  userId: string
  userName: string | null
  rank: number
  value: number
  avatarUrl?: string | null
}

const podiumVariants = cva("flex items-end justify-center gap-4", {
  variants: {
    size: {
      sm: "gap-2",
      default: "gap-4",
      lg: "gap-6",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

const PODIUM_CONFIG = {
  1: {
    icon: Crown,
    color: "text-[#4600F3]",
    bg: "bg-[#4600F3]/60",
    ringColor: "ring-[#4600F3]/50",
    strong: "#4600F3",
    height: "h-32",
    heightSm: "h-24",
    heightLg: "h-40",
  },
  2: {
    icon: Crown,
    color: "text-[#DB2777]",
    bg: "bg-[#DB2777]/30",
    ringColor: "ring-[#DB2777]/50",
    strong: "#DB2777",
    height: "h-24",
    heightSm: "h-20",
    heightLg: "h-32",
  },
  3: {
    icon: Crown,
    color: "text-[#6B33F6]",
    bg: "bg-[#6B33F6]/50",
    ringColor: "ring-[#6B33F6]/50",
    strong: "#6B33F6",
    height: "h-20",
    heightSm: "h-16",
    heightLg: "h-28",
  },
} as const

interface LeaderboardPodiumProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof podiumVariants> {
  rankings: LeaderboardRanking[]
  showValue?: boolean
  showAvatar?: boolean
  medalStyle?: "classic" | "modern" | "minimal"
  formatValue?: (value: number, ranking: LeaderboardRanking) => React.ReactNode
  renderTrigger?: (ranking: LeaderboardRanking, node: React.ReactNode) => React.ReactNode
}

const LeaderboardPodium = React.forwardRef<
  HTMLDivElement,
  LeaderboardPodiumProps
>(
  (
    {
      className,
      size,
      rankings,
      showValue = true,
      showAvatar = true,
      medalStyle = "classic",
      formatValue,
      renderTrigger,
      ...props
    },
    ref
  ) => {
    const top3 = rankings.slice(0, 3)
    const podiumOrder = [
      top3.find((r) => r.rank === 2),
      top3.find((r) => r.rank === 1),
      top3.find((r) => r.rank === 3),
    ].filter(Boolean) as LeaderboardRanking[]

    if (podiumOrder.length === 0) {
      return null
    }

    const avatarSize = {
      sm: "h-10 w-10 text-sm",
      default: "h-14 w-14 text-lg",
      lg: "h-20 w-20 text-2xl",
    }[size ?? "default"]

    const iconSize = {
      sm: "h-4 w-4",
      default: "h-5 w-5",
      lg: "h-6 w-6",
    }[size ?? "default"]

    const textSize = {
      sm: "text-xs",
      default: "text-sm",
      lg: "text-base",
    }[size ?? "default"]

    return (
      <div
        ref={ref}
        className={cn(podiumVariants({ size }), className)}
        role="list"
        aria-label="Top 3 rankings"
        {...props}
      >
        {podiumOrder.map((ranking) => {
          const config = PODIUM_CONFIG[ranking.rank as 1 | 2 | 3]
          if (!config) return null

          const displayName =
            ranking.userName || `User ${ranking.userId.slice(0, 6)}`
          const avatarSrc =
            ranking.avatarUrl ??
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(ranking.userId)}`
          const podiumHeight = {
            sm: config.heightSm,
            default: config.height,
            lg: config.heightLg,
          }[size ?? "default"]

          const shownValue = formatValue
            ? formatValue(ranking.value, ranking)
            : ranking.value.toLocaleString("pt-BR")

          const itemLabel = `Rank ${ranking.rank}: ${displayName}${showValue ? `, ${shownValue}` : ""}`

          const column = (
            <>
              <div className="relative mb-2" aria-hidden="true">
                {ranking.rank === 1 ? (
                  <Crown
                    className="absolute -top-4 left-1/2 h-5 w-5 -translate-x-1/2 text-[#4600F3]"
                  />
                ) : null}
                {showAvatar ? (
                  <img
                    src={avatarSrc}
                    alt=""
                    className={cn("rounded-full bg-white object-cover", avatarSize)}
                    style={{ boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${config.strong}` }}
                  />
                ) : (
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full",
                      avatarSize,
                      config.bg
                    )}
                  >
                    <config.icon className={cn(iconSize, config.color)} />
                  </div>
                )}

                {medalStyle !== "minimal" && (
                  <div
                    className={cn(
                      "absolute -right-1 -bottom-1 flex items-center justify-center rounded-full bg-white shadow-sm",
                      size === "sm"
                        ? "h-5 w-5"
                        : size === "lg"
                          ? "h-8 w-8"
                          : "h-6 w-6"
                    )}
                  >
                    <config.icon
                      className={cn(
                        config.color,
                        size === "sm"
                          ? "h-3 w-3"
                          : size === "lg"
                            ? "h-5 w-5"
                            : "h-4 w-4"
                      )}
                    />
                  </div>
                )}
              </div>

              <span
                className={cn(
                  "max-w-20 truncate text-center font-medium text-[#241B33]",
                  textSize
                )}
                title={displayName}
              >
                {displayName}
              </span>

              {showValue && (
                <span
                  className={cn(
                    "tabular-nums text-[#8A7C98]",
                    size === "sm" ? "text-xs" : "text-sm"
                  )}
                >
                  {shownValue}
                </span>
              )}

              <div
                aria-hidden={renderTrigger ? undefined : true}
                className={cn(
                  "mt-2 w-[5.5rem] rounded-t-lg",
                  size === "sm" && "w-20",
                  size === "lg" && "w-24",
                  podiumHeight,
                  config.bg,
                  medalStyle === "modern" && "rounded-t-xl"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 items-center justify-center font-medium",
                    config.color
                  )}
                >
                  {ranking.rank}
                </div>
              </div>
            </>
          )

          return (
            <div
              key={ranking.userId}
              role="listitem"
              aria-label={itemLabel}
              className="flex flex-col items-center"
            >
              {renderTrigger ? renderTrigger(ranking, column) : column}
            </div>
          )
        })}
      </div>
    )
  }
)
LeaderboardPodium.displayName = "LeaderboardPodium"

export { LeaderboardPodium, podiumVariants, PODIUM_CONFIG }
export type { LeaderboardPodiumProps, LeaderboardRanking }
