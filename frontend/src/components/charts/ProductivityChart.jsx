import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'

const ProductivityChart = ({ data, type = 'pie', title = 'Productivity Analysis' }) => {
  const COLORS = {
    work: '#22c55e',
    break: '#f59e0b',
    meeting: '#3b82f6',
    training: '#8b5cf6',
    other: '#6b7280'
  }

  const formatTooltip = (value, name) => {
    if (name === 'productivityPercentage') {
      return [`${value}%`, 'Productivity']
    }
    if (name.includes('Minutes') || name.includes('minutes')) {
      const hours = Math.floor(value / 60)
      const minutes = value % 60
      return [`${hours}h ${minutes}m`, name]
    }
    return [value, name]
  }

  if (type === 'pie') {
    const pieData = Object.entries(data).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: value,
      fill: COLORS[key] || '#6b7280'
    }))

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltip} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="userName" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={formatTooltip} />
            <Legend />
            <Bar 
              dataKey="productivityPercentage" 
              fill="#3b82f6" 
              name="Productivity %" 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default ProductivityChart
