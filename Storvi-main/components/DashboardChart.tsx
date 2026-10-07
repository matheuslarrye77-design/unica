"use client";

import { calculatePercentage, convertFileSize } from "@/lib/utils";
import {
    Cell,
    Label,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

const STORAGE_LIMIT = 2 * 1024 * 1024 * 1024;

const DashboardChart = ({ usedStorage }: { usedStorage: number }) => {
    const usedPercentage = calculatePercentage(usedStorage);
    const freePercentage = Math.max(100 - usedPercentage, 0);

    const chartData = [
        { name: "Used", value: usedPercentage, fill: "#ffffff" },
        { name: "Free", value: freePercentage, fill: "rgba(255,255,255,0.25)" },
    ];

    return (
        <section className="chart">
            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="65%"
                            outerRadius="90%"
                            startAngle={90}
                            endAngle={-270}
                            stroke="none"
                        >
                            {chartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                            ))}
                            <Label
                                value={`${usedPercentage}%`}
                                position="center"
                                className="chart-total-percentage"
                            />
                        </Pie>
                        <Tooltip
                            formatter={(value: number) => `${value}%`}
                            contentStyle={{
                                border: "0",
                                borderRadius: "8px",
                                color: "#131524",
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="chart-details">
                <p className="chart-title">
                    {convertFileSize(usedStorage)} used
                </p>
                <p className="chart-description">
                    {convertFileSize(usedStorage)} /{" "}
                    {convertFileSize(STORAGE_LIMIT)}
                </p>
            </div>
        </section>
    );
};

export default DashboardChart;
