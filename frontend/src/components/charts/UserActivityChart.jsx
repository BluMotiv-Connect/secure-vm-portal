import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'

const UserActivityChart = ({ data, type = 'bar', title = 'User Activity Analysis' }) => {
  const formatTooltip = (value, name) => {
    if (name.includes('Minutes') || name.includes('minutes')) {
      const hours = Math.floor(value / 60)
      const minutes = value % 60
      return [`${hours}h ${minutes}m`, name]
    }
    return [value, name]
  }

  const formatYAxis = (value) => {
    if (value >= 60) {
      return `${Math.floor(value / 60)}h`
    }
    return `${value}m`
  }

  const ChartComponent = type === 'line' ? LineChart : BarChart

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ChartComponent data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="userName" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={formatYAxis}
            />
            <Tooltip 
              formatter={formatTooltip}
              labelStyle={{ color: '#374151' }}
            />
            <Legend />
            
            {type === 'line' ? (
              <>
                <Line 
                  type="monotone" 
                  dataKey="totalMinutes" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Total Time (minutes)"
                />
                <Line 
                  type="monotone" 
                  dataKey="totalSessions" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Total Sessions"
                />
              </>
            ) : (
              <>
                <Bar 
                  dataKey="totalMinutes" 
                  fill="#3b82f6" 
                  name="Total Time (minutes)"
                />
                <Bar 
                  dataKey="totalSessions" 
                  fill="#22c55e" 
                  name="Total Sessions"
                />
                <Bar 
                  dataKey="uniqueVms" 
                  fill="#f59e0b" 
                  name="Unique VMs"
                />
              </>
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default UserActivityChart
