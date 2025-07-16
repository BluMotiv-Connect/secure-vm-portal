import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/Card'

const WorkTimeChart = ({ data, type = 'line', title = 'Work Time Trends' }) => {
  const formatTooltip = (value, name) => {
    if (name.includes('Minutes') || name.includes('minutes')) {
      const hours = Math.floor(value / 60)
      const minutes = value % 60
      return [`${hours}h ${minutes}m`, name]
    }
    return [value, name]
  }

  const formatYAxis = (value) => {
    const hours = Math.floor(value / 60)
    return `${hours}h`
  }

  const ChartComponent = type === 'bar' ? BarChart : LineChart

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
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={formatYAxis}
            />
            <Tooltip 
              formatter={formatTooltip}
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <Legend />
            
            {type === 'line' ? (
              <>
                <Line 
                  type="monotone" 
                  dataKey="totalMinutes" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Total Time"
                />
                <Line 
                  type="monotone" 
                  dataKey="workMinutes" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Work Time"
                />
                <Line 
                  type="monotone" 
                  dataKey="breakMinutes" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Break Time"
                />
              </>
            ) : (
              <>
                <Bar dataKey="workMinutes" fill="#22c55e" name="Work Time" />
                <Bar dataKey="breakMinutes" fill="#f59e0b" name="Break Time" />
                <Bar dataKey="meetingMinutes" fill="#3b82f6" name="Meeting Time" />
              </>
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default WorkTimeChart
