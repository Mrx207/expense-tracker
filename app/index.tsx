import { supabase } from "@/lib/supabase";
import { useTheme } from "@react-navigation/native";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface DashboardStats {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
  recentTransactions: any[];
}

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    transactionCount: 0,
    recentTransactions: [],
  });
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all transactions for calculations
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select(
          `
          id, amount, description, type, date,
          categories(name),
          subcategories(name)
        `
        )
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching dashboard data:", error);
        return;
      }

      if (transactions) {
        const totalIncome = transactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = transactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0);

        const totalBalance = totalIncome - totalExpenses;

        setStats({
          totalBalance,
          totalIncome,
          totalExpenses,
          transactionCount: transactions.length,
          recentTransactions: transactions.slice(0, 5),
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    }
  };

  const renderQuickAction = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    color: string
  ) => (
    <TouchableOpacity
      style={[styles.quickAction, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + "20" }]}>
        <Text style={[styles.quickActionIconText, { color }]}>{icon}</Text>
      </View>
      <View style={styles.quickActionContent}>
        <Text style={[styles.quickActionTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text
          style={[styles.quickActionSubtitle, { color: colors.text + "80" }]}
        >
          {subtitle}
        </Text>
      </View>
      <Text style={[styles.quickActionArrow, { color: colors.text + "60" }]}>
        ›
      </Text>
    </TouchableOpacity>
  );

  const renderStatCard = (
    title: string,
    amount: number,
    color: string,
    subtitle?: string
  ) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.statTitle, { color: colors.text + "80" }]}>
        {title}
      </Text>
      <Text style={[styles.statAmount, { color }]}>{formatAmount(amount)}</Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, { color: colors.text + "60" }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  const renderRecentTransaction = (transaction: any) => (
    <TouchableOpacity
      key={transaction.id}
      style={[styles.recentTransaction, { backgroundColor: colors.card }]}
      onPress={() => router.push("/transactions/transactions-list")}
      activeOpacity={0.7}
    >
      <View style={styles.transactionLeft}>
        <Text
          style={[styles.transactionCategory, { color: colors.primary }]}
          numberOfLines={1}
        >
          {transaction.categories?.name}
          {transaction.subcategories?.name &&
            ` → ${transaction.subcategories.name}`}
        </Text>
        <Text
          style={[styles.transactionDescription, { color: colors.text }]}
          numberOfLines={1}
        >
          {transaction.description}
        </Text>
        <Text style={[styles.transactionDate, { color: colors.text + "60" }]}>
          {formatDate(transaction.date)}
        </Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          { color: transaction.type === "income" ? "#4CAF50" : "#F44336" },
        ]}
      >
        {transaction.type === "income" ? "+" : "-"}
        {formatAmount(transaction.amount)}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.text + "80" }]}>
            Welcome back!
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Expense Tracker
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.profileButton,
            { backgroundColor: colors.primary + "20" },
          ]}
          onPress={() => {
            /* Add profile/settings navigation */
          }}
        >
          <Text style={[styles.profileIcon, { color: colors.primary }]}>
            👤
          </Text>
        </TouchableOpacity>
      </View>

      {/* Balance Overview */}
      <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text
          style={[
            styles.balanceAmount,
            { color: stats.totalBalance >= 0 ? "#ffffff" : "#ffcdd2" },
          ]}
        >
          {formatAmount(stats.totalBalance)}
        </Text>
        <Text style={styles.balanceSubtitle}>
          {stats.transactionCount} transaction
          {stats.transactionCount !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {renderStatCard("Income", stats.totalIncome, "#4CAF50", "This period")}
        {renderStatCard(
          "Expenses",
          stats.totalExpenses,
          "#F44336",
          "This period"
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Quick Actions
        </Text>

        {renderQuickAction(
          "💰",
          "Add Transaction",
          "Record income or expense",
          () => router.push("/transactions/add-transaction"),
          "#007AFF"
        )}

        {renderQuickAction(
          "📊",
          "View All Transactions",
          "See transaction history",
          () => router.push("/transactions/transactions-list"),
          "#FF9500"
        )}

        {renderQuickAction(
          "📈",
          "Analytics",
          "View spending patterns",
          () => router.push("/analytics"),
          "#34C759"
        )}
      </View>

      {/* Recent Transactions */}
      {stats.recentTransactions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Transactions
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/transactions/transactions-list")}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>

          {stats.recentTransactions.map(renderRecentTransaction)}
        </View>
      )}

      {/* Empty State for No Transactions */}
      {stats.transactionCount === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No transactions yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.text + "60" }]}>
            Start tracking your finances by adding your first transaction
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/transactions/add-transaction")}
          >
            <Text style={styles.emptyButtonText}>Add First Transaction</Text>
          </TouchableOpacity>
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
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  profileIcon: {
    fontSize: 20,
  },
  balanceCard: {
    margin: 20,
    marginTop: 0,
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 16,
    color: "#ffffff80",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 4,
  },
  balanceSubtitle: {
    fontSize: 14,
    color: "#ffffff60",
  },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  statTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  statAmount: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  seeAllText: {
    fontSize: 16,
    fontWeight: "600",
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  quickActionIconText: {
    fontSize: 24,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 14,
  },
  quickActionArrow: {
    fontSize: 24,
    fontWeight: "300",
  },
  recentTransaction: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionLeft: {
    flex: 1,
    marginRight: 12,
  },
  transactionCategory: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 16,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
