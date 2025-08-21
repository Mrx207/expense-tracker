import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const chartWidth = width - 32;

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  categories: { name: string } | null;
  subcategories: { name: string } | null;
}

interface CategorySpending {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  count: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

interface DailyData {
  date: string;
  amount: number;
}

type TimePeriod = '7days' | '30days' | '90days' | '1year' | 'all';

export default function Analytics() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30days');
  
  // Analytics data
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [dailySpending, setDailySpending] = useState<DailyData[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    avgDaily: 0,
    transactionCount: 0,
    topCategory: '',
    savingsRate: 0,
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timePeriod]);

  const getDateFilter = () => {
    const now = new Date();
    const periods = {
      '7days': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30days': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90days': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      '1year': new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      'all': new Date('2020-01-01'), // Far back date
    };
    return periods[timePeriod];
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const fromDate = getDateFilter();

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, amount, type, date,
          categories(name),
          subcategories(name)
        `)
        .gte('date', fromDate.toISOString())
        .order('date', { ascending: true });

      if (error) {
        Alert.alert('Error', 'Failed to fetch analytics data');
        return;
      }

      const transactions = data || [];
      setTransactions(transactions);
      
      // Process data for different charts
      processMonthlyData(transactions);
      processCategoryData(transactions);
      processDailyData(transactions);
      calculateTotalStats(transactions);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (transactions: Transaction[]) => {
    const monthlyMap = new Map<string, { income: number; expense: number }>();
    
    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { income: 0, expense: 0 });
      }
      
      const monthData = monthlyMap.get(monthKey)!;
      if (t.type === 'income') {
        monthData.income += t.amount;
      } else {
        monthData.expense += t.amount;
      }
    });

    const sortedData = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
      }));

    setMonthlyData(sortedData);
  };

  const processCategoryData = (transactions: Transaction[]) => {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const categoryMap = new Map<string, { amount: number; count: number }>();
    
    expenseTransactions.forEach(t => {
      const categoryName = t.categories?.name || 'Uncategorized';
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { amount: 0, count: 0 });
      }
      const categoryData = categoryMap.get(categoryName)!;
      categoryData.amount += t.amount;
      categoryData.count += 1;
    });

    const totalExpenses = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0);
    
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
    
    const categoryData = Array.from(categoryMap.entries())
      .map(([name, data], index) => ({
        name,
        amount: data.amount,
        count: data.count,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 7); // Top 7 categories

    setCategorySpending(categoryData);
  };

  const processDailyData = (transactions: Transaction[]) => {
    const dailyMap = new Map<string, number>();
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    expenseTransactions.forEach(t => {
      const dateKey = t.date.split('T')[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + t.amount);
    });

    const sortedData = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30) // Last 30 days
      .map(([date, amount]) => ({ date, amount }));

    setDailySpending(sortedData);
  };

  const calculateTotalStats = (transactions: Transaction[]) => {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const days = timePeriod === '7days' ? 7 : timePeriod === '30days' ? 30 : timePeriod === '90days' ? 90 : timePeriod === '1year' ? 365 : Math.max(1, transactions.length);
    
    // Find top category
    const categoryMap = new Map<string, number>();
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const category = t.categories?.name || 'Uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + t.amount);
    });
    
    const topCategory = Array.from(categoryMap.entries()).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    setTotalStats({
      totalIncome: income,
      totalExpenses: expenses,
      avgDaily: expenses / days,
      transactionCount: transactions.length,
      topCategory,
      savingsRate,
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderTimePeriodSelector = () => (
    <View style={styles.timePeriodContainer}>
      {(['7days', '30days', '90days', '1year', 'all'] as TimePeriod[]).map(period => (
        <TouchableOpacity
          key={period}
          style={[
            styles.timePeriodButton,
            { backgroundColor: colors.card },
            timePeriod === period && { backgroundColor: colors.primary }
          ]}
          onPress={() => setTimePeriod(period)}
        >
          <Text style={[
            styles.timePeriodText,
            { color: colors.text },
            timePeriod === period && { color: '#fff' }
          ]}>
            {period === '7days' ? '7D' : 
             period === '30days' ? '30D' : 
             period === '90days' ? '90D' : 
             period === '1year' ? '1Y' : 'All'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStatsCard = (title: string, value: string, subtitle?: string, color?: string) => (
    <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.statsTitle, { color: colors.text + '80' }]}>{title}</Text>
      <Text style={[styles.statsValue, { color: color || colors.text }]}>{value}</Text>
      {subtitle && <Text style={[styles.statsSubtitle, { color: colors.text + '60' }]}>{subtitle}</Text>}
    </View>
  );

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => colors.primary + Math.round(opacity * 255).toString(16),
    labelColor: (opacity = 1) => colors.text + Math.round(opacity * 255).toString(16),
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Time Period Selector */}
      {renderTimePeriodSelector()}

      {/* Summary Stats */}
      <View style={styles.statsGrid}>
        {renderStatsCard('Total Income', formatAmount(totalStats.totalIncome), `${totalStats.transactionCount} transactions`, '#4CAF50')}
        {renderStatsCard('Total Expenses', formatAmount(totalStats.totalExpenses), 'This period', '#F44336')}
      </View>

      <View style={styles.statsGrid}>
        {renderStatsCard('Daily Average', formatAmount(totalStats.avgDaily), 'Expense per day')}
        {renderStatsCard('Savings Rate', `${totalStats.savingsRate.toFixed(1)}%`, 'Income saved', totalStats.savingsRate > 0 ? '#4CAF50' : '#F44336')}
      </View>

      {/* Monthly Trend */}
      {monthlyData.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Monthly Trend</Text>
          <BarChart
            data={{
              labels: monthlyData.map(d => d.month),
              datasets: [
                {
                  data: monthlyData.map(d => d.expense),
                  color: (opacity = 1) => `#F44336${Math.round(opacity * 255).toString(16)}`,
                },
                {
                  data: monthlyData.map(d => d.income),
                  color: (opacity = 1) => `#4CAF50${Math.round(opacity * 255).toString(16)}`,
                }
              ],
              legend: ['Expenses', 'Income']
            }}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            showBarTops={false}
            fromZero
          />
        </View>
      )}

      {/* Category Breakdown */}
      {categorySpending.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Expense Categories</Text>
          <PieChart
            data={categorySpending.map(cat => ({
              name: cat.name,
              population: cat.amount,
              color: cat.color,
              legendFontColor: colors.text,
              legendFontSize: 12,
            }))}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
          
          {/* Category List */}
          <View style={styles.categoryList}>
            {categorySpending.map((category, index) => (
              <View key={index} style={[styles.categoryItem, { backgroundColor: colors.card }]}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                  <View>
                    <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
                    <Text style={[styles.categoryCount, { color: colors.text + '60' }]}>
                      {category.count} transaction{category.count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={[styles.categoryAmount, { color: colors.text }]}>
                    {formatAmount(category.amount)}
                  </Text>
                  <Text style={[styles.categoryPercentage, { color: colors.text + '60' }]}>
                    {category.percentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Daily Spending Trend */}
      {dailySpending.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Daily Spending Trend</Text>
          <LineChart
            data={{
              labels: dailySpending.slice(-7).map(d => new Date(d.date).getDate().toString()),
              datasets: [{
                data: dailySpending.slice(-7).map(d => d.amount),
                strokeWidth: 3,
              }]
            }}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withDots
            withShadow
            withInnerLines={false}
            withOuterLines={false}
          />
        </View>
      )}

      {/* Insights */}
      <View style={styles.insightsContainer}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Insights</Text>
        <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.insightTitle, { color: colors.text }]}>💡 Top Spending Category</Text>
          <Text style={[styles.insightText, { color: colors.text + '80' }]}>
            You spend most on <Text style={{ fontWeight: 'bold' }}>{totalStats.topCategory}</Text> this period.
          </Text>
        </View>
        
        {totalStats.savingsRate > 0 ? (
          <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.insightTitle, { color: '#4CAF50' }]}>✅ Good Savings</Text>
            <Text style={[styles.insightText, { color: colors.text + '80' }]}>
              You're saving {totalStats.savingsRate.toFixed(1)}% of your income. Keep it up!
            </Text>
          </View>
        ) : (
          <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.insightTitle, { color: '#F44336' }]}>⚠️ Spending Alert</Text>
            <Text style={[styles.insightText, { color: colors.text + '80' }]}>
              Your expenses exceed income this period. Consider budgeting.
            </Text>
          </View>
        )}
      </View>

      {/* Empty State */}
      {transactions.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Data Available</Text>
          <Text style={[styles.emptySubtitle, { color: colors.text + '60' }]}>
            Add some transactions to see your spending analytics
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  timePeriodContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  timePeriodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timePeriodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  statsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsSubtitle: {
    fontSize: 12,
  },
  chartContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  categoryList: {
    marginTop: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  categoryPercentage: {
    fontSize: 12,
  },
  insightsContainer: {
    margin: 16,
  },
  insightCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});