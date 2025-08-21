import { supabase } from "@/lib/supabase";
import React, { useEffect, useState, useCallback } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: "income" | "expense";
  date: string;
  categories?: { name: string };
  subcategories?: { name: string };
}

export default function TransactionsList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Fetch transactions when component mounts
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Refresh transactions when screen comes into focus (after editing/adding)
  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [])
  );

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id, amount, description, type, date, categories(name), subcategories(name)"
        )
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching transactions:", error);
        Alert.alert("Error", "Failed to fetch transactions");
      } else {
        setTransactions(data || []);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  // 🗑️ Delete a transaction
  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) {
        console.error("Error deleting transaction:", error);
        Alert.alert("Error", "Failed to delete transaction");
      } else {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        Alert.alert("Success", "Transaction deleted successfully");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  // ⚡ Confirm delete on long press
  const confirmDelete = (id: string, description: string) => {
    Alert.alert(
      "Delete Transaction",
      `Are you sure you want to delete "${description}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTransaction(id),
        },
      ]
    );
  };

  // ✏️ Navigate to edit form
  const editTransaction = (transaction: Transaction) => {
    // Navigate to add-transaction page with transaction data for editing
    router.push({
      pathname: "/transactions/add-transaction",
      params: {
        editMode: "true",
        transactionId: transaction.id,
        amount: transaction.amount.toString(),
        description: transaction.description,
        type: transaction.type,
        date: transaction.date,
        categoryName: transaction.categories?.name || "",
        subcategoryName: transaction.subcategories?.name || "",
      },
    });
  };

  // 📊 Calculate total balance
  const getTotalBalance = () => {
    return transactions.reduce((total, transaction) => {
      return transaction.type === "income" 
        ? total + transaction.amount 
        : total - transaction.amount;
    }, 0);
  };

  // 💰 Calculate total income and expenses
  const getTotals = () => {
    const income = transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expenses };
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
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
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.transaction}
      onPress={() => editTransaction(item)}
      onLongPress={() => confirmDelete(item.id, item.description)}
      activeOpacity={0.7}
    >
      <View style={styles.transactionLeft}>
        <Text style={styles.category}>
          {item.categories?.name}{item.subcategories?.name && ` → ${item.subcategories.name}`}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.date}>
          {formatDate(item.date)}
        </Text>
      </View>
      <View style={styles.transactionRight}>
        <Text
          style={[
            styles.amount,
            { color: item.type === "income" ? "#4CAF50" : "#F44336" },
          ]}
        >
          {item.type === "income" ? "+" : "-"}
          {formatAmount(item.amount)}
        </Text>
        <Text style={styles.transactionType}>
          {item.type === "income" ? "Income" : "Expense"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => {
    const { income, expenses } = getTotals();
    const balance = getTotalBalance();

    return (
      <View style={styles.header}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Balance</Text>
          <Text style={[styles.balanceAmount, { color: balance >= 0 ? "#4CAF50" : "#F44336" }]}>
            {formatAmount(balance)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryAmount, { color: "#4CAF50" }]}>
              {formatAmount(income)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryAmount, { color: "#F44336" }]}>
              {formatAmount(expenses)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No transactions found</Text>
      <Text style={styles.emptySubtext}>
        Tap the + button to add your first transaction
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTransaction}
        ListHeaderComponent={transactions.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#007AFF"]}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={transactions.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8f9fa" 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
    borderRadius: 12,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryCard: {
    alignItems: "center",
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "bold",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: "600",
  },
  transaction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionLeft: {
    flex: 1,
    marginRight: 12,
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  category: { 
    fontWeight: "600", 
    fontSize: 14, 
    color: "#007AFF",
    marginBottom: 2,
  },
  description: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  date: { 
    fontSize: 12, 
    color: "#888" 
  },
  amount: { 
    fontWeight: "bold", 
    fontSize: 18,
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 12,
    color: "#666",
    textTransform: "capitalize",
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});