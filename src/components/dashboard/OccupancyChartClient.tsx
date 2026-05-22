'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface OccupancyPoint {
  date: string
  rate: number
}

export function OccupancyChartClient({ data }: { data: OccupancyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="occupancyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1A5C38" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#1A5C38" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${v ?? 0}%`}
          domain={[0, 100]}
        />
        <Tooltip formatter={(v) => [`${v ?? 0}%`, 'Occupancy']} />
        <Area
          type="monotone"
          dataKey="rate"
          stroke="#1A5C38"
          strokeWidth={2}
          fill="url(#occupancyGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
