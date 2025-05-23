"use client";

import React, { useMemo } from "react";
import { Card, Skeleton, Title } from "@mantine/core";
import { WarehouseItem } from "@/types/warehouse";
import dynamic from "next/dynamic";

// Dynamically import ApexCharts with disabled SSR
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface CategoryDistributionChartProps {
  items: WarehouseItem[];
  isLoading: boolean;
}

export default function CategoryDistributionChart({
  items,
  isLoading,
}: CategoryDistributionChartProps) {
  // Process data for the chart
  const chartData = useMemo(() => {
    // Group items by category and count
    const categoryMap = new Map<string, number>();

    items.forEach((item) => {
      const currentCount = categoryMap.get(item.category) || 0;
      categoryMap.set(item.category, currentCount + item.quantity);
    });

    // Convert to series data
    const labels: string[] = [];
    const series: number[] = [];

    categoryMap.forEach((count, category) => {
      labels.push(category);
      series.push(count);
    });

    return { labels, series };
  }, [items]);

  const options = {
    labels: chartData.labels,
    legend: {
      position: "bottom" as const,
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            height: 300,
          },
          legend: {
            position: "bottom" as const,
          },
        },
      },
    ],
    colors: ["#4CAF50", "#2196F3", "#FFC107", "#FF5722", "#9C27B0", "#3F51B5"],
  };

  return (
    <Card withBorder p="md" h="100%">
      <Title order={4} mb="md">
        Распределение по категориям
      </Title>

      {isLoading ? (
        <Skeleton height={300} />
      ) : chartData.series.length > 0 ? (
        <ReactApexChart
          options={options}
          series={chartData.series}
          type="pie"
          height={300}
        />
      ) : (
        <div
          style={{
            height: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Нет данных для отображения
        </div>
      )}
    </Card>
  );
}
