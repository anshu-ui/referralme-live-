import { useMemo } from "react";
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
  Bar,
  Area,
  AreaChart,
} from "recharts";

interface ApplicationTrendsChartProps {
  applications?: any[];
  type?: "line" | "bar" | "area";
}

export default function ApplicationTrendsChart({ 
  applications = [], 
  type = "area" 
}: ApplicationTrendsChartProps) {
  
  const chartData = useMemo(() => {
    if (!applications || applications.length === 0) {
      // Generate sample data based on realistic application patterns
      const now = new Date();
      const data = [];
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        
        // Simulate realistic application patterns
        const baseApplications = Math.floor(Math.random() * 8) + 2; // 2-10 applications per month
        const responses = Math.floor(baseApplications * (0.3 + Math.random() * 0.4)); // 30-70% response rate
        const interviews = Math.floor(responses * (0.2 + Math.random() * 0.3)); // 20-50% interview rate
        const offers = Math.floor(interviews * (0.1 + Math.random() * 0.4)); // 10-50% offer rate
        
        data.push({
          month: date.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
          applications: baseApplications,
          responses: responses,
          interviews: interviews,
          offers: offers,
          responseRate: Math.round((responses / baseApplications) * 100),
          interviewRate: Math.round((interviews / baseApplications) * 100),
        });
      }
      
      return data;
    }

    // Process real application data by month
    const monthlyData = applications.reduce((acc, app) => {
      const date = new Date(app.createdAt?.toDate() || app.createdAt);
      const monthKey = date.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          applications: 0,
          responses: 0,
          interviews: 0,
          offers: 0,
        };
      }
      
      acc[monthKey].applications++;
      
      if (app.status && app.status !== 'pending') {
        acc[monthKey].responses++;
      }
      
      if (app.status === 'interview_scheduled' || app.status === 'interview_completed') {
        acc[monthKey].interviews++;
      }
      
      if (app.status === 'accepted' || app.status === 'completed') {
        acc[monthKey].offers++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(monthlyData).map((data: any) => ({
      ...data,
      responseRate: data.applications > 0 ? Math.round((data.responses / data.applications) * 100) : 0,
      interviewRate: data.applications > 0 ? Math.round((data.interviews / data.applications) * 100) : 0,
    }));
  }, [applications]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey.charAt(0).toUpperCase() + entry.dataKey.slice(1)}: ${entry.value}${entry.dataKey.includes('Rate') ? '%' : ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis stroke="#6b7280" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="applications" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
            name="Applications"
          />
          <Line 
            type="monotone" 
            dataKey="responses" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
            name="Responses"
          />
          <Line 
            type="monotone" 
            dataKey="interviews" 
            stroke="#f59e0b" 
            strokeWidth={2}
            dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
            name="Interviews"
          />
          <Line 
            type="monotone" 
            dataKey="offers" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
            name="Offers"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis stroke="#6b7280" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="applications" fill="#3b82f6" name="Applications" />
          <Bar dataKey="responses" fill="#10b981" name="Responses" />
          <Bar dataKey="interviews" fill="#f59e0b" name="Interviews" />
          <Bar dataKey="offers" fill="#ef4444" name="Offers" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Default to area chart
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="applications" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="responses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="interviews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="month" 
          stroke="#6b7280"
          fontSize={12}
        />
        <YAxis stroke="#6b7280" fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Area
          type="monotone"
          dataKey="applications"
          stroke="#3b82f6"
          fillOpacity={1}
          fill="url(#applications)"
          strokeWidth={2}
          name="Applications"
        />
        <Area
          type="monotone"
          dataKey="responses"
          stroke="#10b981"
          fillOpacity={1}
          fill="url(#responses)"
          strokeWidth={2}
          name="Responses"
        />
        <Area
          type="monotone"
          dataKey="interviews"
          stroke="#f59e0b"
          fillOpacity={1}
          fill="url(#interviews)"
          strokeWidth={2}
          name="Interviews"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}