import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const chartTypes = ["bar", "line", "pie"];

export default function ChartBuilder({ dataset, chartType, onChartTypeChange, xAxis, yAxis, onAxisChange }) {
  const renderChart = () => {
    if (chartType === "line") {
      return (
        <LineChart data={dataset}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxis} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={yAxis} stroke="#1570ef" strokeWidth={3} />
        </LineChart>
      );
    }

    if (chartType === "pie") {
      return (
        <PieChart>
          <Tooltip />
          <Legend />
          <Pie data={dataset} dataKey={yAxis} nameKey={xAxis} fill="#1570ef" />
        </PieChart>
      );
    }

    return (
      <BarChart data={dataset}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxis} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey={yAxis} fill="#1570ef" radius={[6, 6, 0, 0]} />
      </BarChart>
    );
  };

  return (
    <div className="card">
      <div className="chart-controls">
        <label>
          Chart Type
          <select value={chartType} onChange={(event) => onChartTypeChange(event.target.value)}>
            {chartTypes.map((type) => (
              <option key={type} value={type}>
                {type.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <label>
          X Axis
          <select value={xAxis} onChange={(event) => onAxisChange("x", event.target.value)}>
            {Object.keys(dataset[0] ?? {}).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>

        <label>
          Y Axis
          <select value={yAxis} onChange={(event) => onAxisChange("y", event.target.value)}>
            {Object.keys(dataset[0] ?? {}).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
