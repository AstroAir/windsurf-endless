/**
 * Statistics Page Component
 * Shows usage analytics and trends
 */

import {
  Activity,
  BarChart3,
  Calendar,
  Clock,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { useConversations, useHistory } from '../store';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444'];

export function StatsPage() {
  const { conversations } = useConversations();
  const { history } = useHistory();

  // Calculate statistics
  const stats = useMemo(() => {
    const totalConversations = conversations.length;
    const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);
    const totalHistoryItems = history.length;
    const continueCount = history.filter(h => h.action === 'continue').length;
    const endCount = history.filter(h => h.action === 'end').length;
    const continueRate = totalHistoryItems > 0 ? (continueCount / totalHistoryItems * 100).toFixed(1) : '0';

    return {
      totalConversations,
      totalMessages,
      totalHistoryItems,
      continueCount,
      endCount,
      continueRate,
    };
  }, [conversations, history]);

  // Prepare chart data - last 7 days activity
  const activityData = useMemo(() => {
    const days: { name: string; continues: number; ends: number; total: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime();

      const dayHistory = history.filter(h => h.timestamp >= dayStart && h.timestamp <= dayEnd);
      const continues = dayHistory.filter(h => h.action === 'continue').length;
      const ends = dayHistory.filter(h => h.action === 'end').length;

      days.push({
        name: dateStr,
        continues,
        ends,
        total: continues + ends,
      });
    }

    return days;
  }, [history]);

  // Pie chart data for action distribution
  const actionDistribution = useMemo(() => {
    return [
      { name: '继续对话', value: stats.continueCount, color: COLORS[0] },
      { name: '结束对话', value: stats.endCount, color: COLORS[4] },
    ].filter(d => d.value > 0);
  }, [stats]);

  // Conversation activity data
  const conversationActivity = useMemo(() => {
    return conversations
      .slice(0, 5)
      .map(c => ({
        name: c.name.length > 10 ? `${c.name.slice(0, 10)}...` : c.name,
        messages: c.messages.length,
      }));
  }, [conversations]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="size-5" />
          数据统计
        </h2>
        <p className="text-sm text-muted-foreground">查看使用情况和趋势分析</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总对话数</CardTitle>
            <MessageSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">个独立对话</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总消息数</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
            <p className="text-xs text-muted-foreground">条交互记录</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">历史记录</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHistoryItems}</div>
            <p className="text-xs text-muted-foreground">次 Infinite Ask</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">继续率</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.continueRate}
              %
            </div>
            <p className="text-xs text-muted-foreground">选择继续对话</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Activity Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              7天活动趋势
            </CardTitle>
            <CardDescription>最近7天的 Infinite Ask 使用情况</CardDescription>
          </CardHeader>
          <CardContent>
            {activityData.some(d => d.total > 0)
              ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={activityData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="continues"
                        stackId="1"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.6}
                        name="继续"
                      />
                      <Area
                        type="monotone"
                        dataKey="ends"
                        stackId="1"
                        stroke="hsl(var(--destructive))"
                        fill="hsl(var(--destructive))"
                        fillOpacity={0.6}
                        name="结束"
                      />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                )
              : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    暂无数据
                  </div>
                )}
          </CardContent>
        </Card>

        {/* Action Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              操作分布
            </CardTitle>
            <CardDescription>继续与结束的比例</CardDescription>
          </CardHeader>
          <CardContent>
            {actionDistribution.length > 0
              ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={actionDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {actionDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )
              : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    暂无数据
                  </div>
                )}
          </CardContent>
        </Card>
      </div>

      {/* Conversation Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-5" />
            对话活跃度
          </CardTitle>
          <CardDescription>各对话的消息数量（前5个）</CardDescription>
        </CardHeader>
        <CardContent>
          {conversationActivity.length > 0
            ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={conversationActivity} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="消息数" />
                  </BarChart>
                </ResponsiveContainer>
              )
            : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  暂无对话数据
                </div>
              )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StatsPage;
