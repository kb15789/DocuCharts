import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function ChartBuilder({
  dataset,
  xAxis,
  yAxis,
  aggregation,
  onAxisChange,
  onAggregationChange,
  columns,
  numericColumns,
}) {
  const yAxisOptions = aggregation === "count" ? columns : numericColumns;
  const yAxisDisabled = aggregation === "count" || yAxisOptions.length === 0;
  return (
    <div className="card">
      <div className="chart-controls">
        <label>
          X Axis
          <select value={xAxis} onChange={(event) => onAxisChange("x", event.target.value)}>
            {columns.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>

        <label>
          Y Axis Aggregation
          <select value={aggregation} onChange={(event) => onAggregationChange(event.target.value)}>
            <option value="sum">Sum</option>
            <option value="count">Count</option>
            <option value="average">Average</option>
          </select>
        </label>

        <label>
          Y Axis Column
          <select
            value={yAxis}
            onChange={(event) => onAxisChange("y", event.target.value)}
            disabled={aggregation === "count" || yAxisOptions.length === 0}
          >
            {yAxisOptions.length === 0 && <option value="">No numeric columns</option>}
            {yAxisOptions.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataset}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#1570ef" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
