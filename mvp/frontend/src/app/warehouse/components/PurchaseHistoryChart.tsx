"use client";

import React, { useMemo } from "react";
import { Card, Skeleton, Title } from "@mantine/core";
import { WarehouseItem } from "@/types/warehouse";
import dynamic from "next/dynamic";

// Dynamically import ApexCharts with disabled SSR
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface PurchaseHistoryChartProps {
  items: WarehouseItem[];
  isLoading: boolean;
}

export default function PurchaseHistoryChart({
  items,
  isLoading,
}: PurchaseHistoryChartProps) {
  // Process data for the chart
  const chartData = useMemo(() => {
    // Group purchases by month
    const monthlyPurchases = new Map<string, number>();

    // Sort items by purchase date
    const sortedItems = [...items].sort((a, b) => {
      return (
        new Date(a.purchase_date).getTime() -
        new Date(b.purchase_date).getTime()
      );
    });

    sortedItems.forEach((item) => {
      const purchaseDate = new Date(item.purchase_date);
      const monthYear = `${
        purchaseDate.getMonth() + 1
      }/${purchaseDate.getFullYear()}`;

      const currentValue = monthlyPurchases.get(monthYear) || 0;
      monthlyPurchases.set(
        monthYear,
        currentValue + item.price * item.quantity
      );
    });

    // Get the last 12 months of data (or less if we don't have 12 months of data)
    const months = Array.from(monthlyPurchases.keys()).slice(-12);
    const values = months.map((month) => monthlyPurchases.get(month) || 0);

    // Format month labels for display
    const formattedMonths = months.map((month) => {
      const [m, y] = month.split("/");
      const monthNames = [
        "Янв",
        "Фев",
        "Мар",
        "Апр",
        "Май",
        "Июн",
        "Июл",
        "Авг",
        "Сен",
        "Окт",
        "Ноя",
        "Дек",
      ];
      return `${monthNames[parseInt(m) - 1]} ${y}`;
    });

    return { months: formattedMonths, values };
  }, [items]);

  const options = {
    chart: {
      type: "area" as const,
      height: 350,
      zoom: {
        enabled: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth" as const,
    },
    title: {
      text: "Расходы на закупки по месяцам",
      align: "left" as const,
    },
    xaxis: {
      categories: chartData.months,
    },
    yaxis: {
      labels: {
        formatter: (value: number) => {
          return value.toLocaleString("ru-RU") + " ₽";
        },
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) => {
          return value.toLocaleString("ru-RU") + " ₽";
        },
      },
    },
  };

  const series = [
    {
      name: "Расходы",
      data: chartData.values,
    },
  ];

  return (
    <Card withBorder p="md" h="100%">
      <Title order={4} mb="md">
        История закупок
      </Title>

      {isLoading ? (
        <Skeleton height={300} />
      ) : chartData.months.length > 0 ? (
        <ReactApexChart
          options={options}
          series={series}
          type="area"
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
