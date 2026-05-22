'use client'

import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SourcePoint {
  name: string
  value: number
  fill: string
}

export function BookingSourceChartClient({ data }: { data: SourcePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          dataKey="value"
          nameKey="name"
        />
        <Tooltip formatter={(v) => [v ?? 0, '']} />
        <Legend iconType="circle" iconSize={10} />
      </PieChart>
    </ResponsiveContainer>
  )
}
