import { useColorScheme } from "@/hooks/useColorScheme";
import { supabase } from "@/lib/supabase";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

export default function AddTransaction() {
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);
  const router = useRouter();
  const params = useLocalSearchParams();

  // Check if we're in edit mode
  const isEditMode = params.editMode === "true";
  const transactionId = params.transactionId as string;

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [date, setDate] = useState(new Date());

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Initialize form data
  useEffect(() => {
    const initializeForm = async () => {
      try {
        setInitialLoading(true);

        // First load categories
        await fetchCategories();

        // If in edit mode, pre-fill form data
        if (isEditMode && params.amount) {
          setAmount(params.amount as string);
          setDescription((params.description as string) || "");
          setType((params.type as "income" | "expense") || "expense");

          if (params.date) {
            setDate(new Date(params.date as string));
          }
        }
      } catch (error) {
        console.error("Error initializing form:", error);
        Alert.alert("Error", "Failed to load form data");
      } finally {
        setInitialLoading(false);
      }
    };

    initializeForm();
  }, []);

  // Handle category/subcategory matching after categories are loaded
  useEffect(() => {
    if (isEditMode && categories.length > 0 && params.categoryName) {
      const categoryName = params.categoryName as string;
      const category = categories.find((cat) => cat.name === categoryName);

      if (category) {
        setSelectedCategory(category.id);
      }
    }
  }, [categories, isEditMode, params.categoryName]);

  // Handle subcategory matching after subcategories are loaded
  useEffect(() => {
    if (isEditMode && subcategories.length > 0 && params.subcategoryName) {
      const subcategoryName = params.subcategoryName as string;
      const subcategory = subcategories.find(
        (sub) => sub.name === subcategoryName
      );

      if (subcategory) {
        setSelectedSubcategory(subcategory.id);
      }
    }
  }, [subcategories, isEditMode, params.subcategoryName]);

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);

  const handleConfirm = (selectedDate: Date) => {
    console.log("A date has been picked: ", selectedDate);
    setDate(selectedDate);
    hideDatePicker();
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Fetch categories
  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, type")
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      Alert.alert("Error", "Failed to fetch categories");
      setCategories([]);
    }
  }

  async function fetchSubcategories(categoryId: string) {
    try {
      const { data, error } = await supabase
        .from("subcategories")
        .select("id, name, category_id")
        .eq("category_id", categoryId)
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

      setSubcategories(data || []);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      Alert.alert("Error", "Failed to fetch subcategories");
      setSubcategories([]);
    }
  }

  // Fetch subcategories when category changes
  useEffect(() => {
    if (selectedCategory) {
      fetchSubcategories(selectedCategory);
    } else {
      setSubcategories([]);
      setSelectedSubcategory("");
    }
  }, [selectedCategory]);

  // Validate form data
  const validateForm = () => {
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert("Invalid Input", "Please enter a valid amount");
      return false;
    }

    if (parseFloat(amount) <= 0) {
      Alert.alert("Invalid Input", "Amount must be greater than 0");
      return false;
    }

    if (!selectedCategory) {
      Alert.alert("Missing Information", "Please select a category");
      return false;
    }

    if (!description.trim()) {
      Alert.alert("Missing Information", "Please enter a description");
      return false;
    }

    return true;
  };

  async function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const transactionData = {
        amount: parseFloat(amount),
        description: description.trim(),
        type,
        date: date.toISOString(),
        category_id: selectedCategory,
        subcategory_id: selectedSubcategory || null,
      };

      let error;

      if (isEditMode) {
        // Update existing transaction
        const { error: updateError } = await supabase
          .from("transactions")
          .update(transactionData)
          .eq("id", transactionId);
        error = updateError;
      } else {
        // Insert new transaction
        const { error: insertError } = await supabase
          .from("transactions")
          .insert([transactionData]);
        error = insertError;
      }

      if (error) {
        console.error(
          `Error ${isEditMode ? "updating" : "adding"} transaction:`,
          error
        );
        Alert.alert(
          "Error",
          `Failed to ${
            isEditMode ? "update" : "add"
          } transaction. Please try again.`
        );
      } else {
        Alert.alert(
          "Success",
          `Transaction ${isEditMode ? "updated" : "added"} successfully!`,
          [
            {
              text: "OK",
              onPress: () => {
                if (isEditMode) {
                  // Go back to transaction list
                  router.back();
                } else {
                  // Reset form for new transaction
                  resetForm();
                }
              },
            },
          ]
        );
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setType("expense");
    setSelectedCategory("");
    setSelectedSubcategory("");
    setDate(new Date());
  };

  const handleCancel = () => {
    if (isEditMode) {
      router.back();
    } else {
      // Show confirmation if form has data
      const hasData = amount || description || selectedCategory;

      if (hasData) {
        Alert.alert(
          "Discard Changes",
          "Are you sure you want to discard your changes?",
          [
            { text: "Keep Editing", style: "cancel" },
            {
              text: "Discard",
              style: "destructive",
              onPress: () => {
                resetForm();
                router.back();
              },
            },
          ]
        );
      } else {
        router.back();
      }
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {isEditMode ? "Loading transaction..." : "Loading..."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isEditMode ? "Edit Transaction" : "Add Transaction"}
        </Text>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Amount *</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={colorScheme === "dark" ? "#888" : "#666"}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter description"
          placeholderTextColor={colorScheme === "dark" ? "#888" : "#666"}
          multiline
          numberOfLines={2}
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === "expense" && styles.activeTypeButton,
              type === "expense" && { backgroundColor: "#FF6B6B" },
            ]}
            onPress={() => setType("expense")}
          >
            <Text
              style={[
                styles.typeButtonText,
                type === "expense" && styles.activeTypeButtonText,
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === "income" && styles.activeTypeButton,
              type === "income" && { backgroundColor: "#4ECDC4" },
            ]}
            onPress={() => setType("income")}
          >
            <Text
              style={[
                styles.typeButtonText,
                type === "income" && styles.activeTypeButtonText,
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.dateButton} onPress={showDatePicker}>
          <Text style={styles.dateText}>{formatDate(date)}</Text>
          <Text style={styles.dateIcon}>📅</Text>
        </TouchableOpacity>

        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          date={date}
          onConfirm={handleConfirm}
          onCancel={hideDatePicker}
        />

        <Text style={styles.label}>Category *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCategory}
            onValueChange={setSelectedCategory}
            style={styles.picker}
            dropdownIconColor={colorScheme === "dark" ? "#fff" : "#000"}
          >
            <Picker.Item
              label="Select category"
              value=""
              color={colorScheme === "dark" ? "#888" : "#666"}
            />
            {categories
              .filter((cat) => cat.type === type)
              .map((cat) => (
                <Picker.Item
                  key={cat.id}
                  label={cat.name}
                  value={cat.id}
                  color={colorScheme === "dark" ? "#000" : "#fff"}
                />
              ))}
          </Picker>
        </View>

        <Text style={styles.label}>Subcategory</Text>
        <View
          style={[
            styles.pickerContainer,
            !subcategories.length && styles.disabledPicker,
          ]}
        >
          <Picker
            selectedValue={selectedSubcategory}
            onValueChange={setSelectedSubcategory}
            enabled={subcategories.length > 0}
            style={styles.picker}
            dropdownIconColor={colorScheme === "dark" ? "#fff" : "#000"}
          >
            <Picker.Item
              label={
                subcategories.length > 0
                  ? "Select subcategory"
                  : "No subcategories available"
              }
              value=""
              color={colorScheme === "dark" ? "#888" : "#666"}
            />
            {subcategories.map((sub) => (
              <Picker.Item
                key={sub.id}
                label={sub.name}
                value={sub.id}
                color={colorScheme === "dark" ? "#fff" : "#000"}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.requiredFieldsNote}>* Required fields</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditMode ? "Update Transaction" : "Add Transaction"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function getStyles(colorScheme: "light" | "dark" | null) {
  const isDark = colorScheme === "dark";

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#121212" : "#f8f9fa",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: isDark ? "#121212" : "#f8f9fa",
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: isDark ? "#fff" : "#666",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      backgroundColor: isDark ? "#1e1e1e" : "#fff",
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#333" : "#e0e0e0",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: isDark ? "#fff" : "#000",
    },
    cancelButton: {
      padding: 8,
    },
    cancelButtonText: {
      fontSize: 16,
      color: "#007AFF",
    },
    form: {
      padding: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#fff" : "#000",
      marginTop: 16,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? "#444" : "#ddd",
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: isDark ? "#1e1e1e" : "#fff",
      color: isDark ? "#fff" : "#000",
      fontSize: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    typeToggle: {
      flexDirection: "row",
      borderRadius: 12,
      backgroundColor: isDark ? "#1e1e1e" : "#fff",
      padding: 4,
      marginBottom: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    typeButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      backgroundColor: "transparent",
    },
    activeTypeButton: {
      backgroundColor: "#007AFF",
    },
    typeButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#fff" : "#000",
    },
    activeTypeButtonText: {
      color: "#fff",
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: isDark ? "#444" : "#ddd",
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: isDark ? "#1e1e1e" : "#fff",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    picker: {
      backgroundColor: isDark ? "#1e1e1e" : "#fff",
      color: isDark ? "#fff" : "#000",
      ...Platform.select({
        android: {
          color: isDark ? "#fff" : "#000",
        },
      }),
    },
    disabledPicker: {
      opacity: 0.5,
    },
    dateButton: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: isDark ? "#444" : "#ddd",
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: isDark ? "#1e1e1e" : "#fff",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    dateText: {
      color: isDark ? "#fff" : "#000",
      fontSize: 16,
    },
    dateIcon: {
      fontSize: 20,
    },
    requiredFieldsNote: {
      fontSize: 12,
      color: isDark ? "#888" : "#666",
      fontStyle: "italic",
      marginTop: 8,
      marginBottom: 16,
    },
    buttonContainer: {
      marginTop: 24,
      marginBottom: 40,
    },
    submitButton: {
      backgroundColor: "#007AFF",
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    disabledButton: {
      backgroundColor: "#888",
    },
    submitButtonText: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "600",
    },
  });
}
