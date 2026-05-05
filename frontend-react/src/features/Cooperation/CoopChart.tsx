import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CoopChartProps {
  data: any[];
  labelKey: string;
  title: string;
}

const CoopChart: React.FC<CoopChartProps> = ({ data, labelKey }) => {
  const chartData = {
    labels: data.map(d => (d[labelKey] || '').toString().substring(0, 25)),
    datasets: [
      {
        data: data.map(d => d.co_count),
        backgroundColor: '#388bfd',
        borderRadius: 4,
        hoverBackgroundColor: '#58a6ff',
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#161b22',
        titleColor: '#58a6ff',
        bodyColor: '#c9d1d9',
        borderColor: '#30363d',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#8b949e',
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#c9d1d9',
          font: {
            size: 11,
          },
        },
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default CoopChart;
