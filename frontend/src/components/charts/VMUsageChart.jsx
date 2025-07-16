import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const VMUsageChart = ({ data }) => {
  // Transform data for the chart
  const chartData = data.map(vm => ({
    name: vm.vm_name,
    hours: Number((vm.total_minutes / 60).toFixed(1))
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name"
          tick={{ fontSize: 12 }}
          interval={0}
          angle={-45}
          textAnchor="end"
        />
        <YAxis
          label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value) => [`${value} hours`, 'Usage']}
          labelStyle={{ color: '#666' }}
        />
        <Bar dataKey="hours" fill="#4F46E5" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default VMUsageChart;
