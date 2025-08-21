import { supabase } from "@/lib/supabase";
import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  editData?: {
    id: string;
    title: string;
    amount: number;
    category: string;
  } | null;
}

export default function TransactionForm({
  visible,
  onClose,
  onSaved,
  editData,
}: Props) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (editData) {
      setTitle(editData.title);
      setAmount(editData.amount.toString());
      setCategory(editData.category);
    } else {
      setTitle("");
      setAmount("");
      setCategory("");
    }
  }, [editData]);

  const saveTransaction = async () => {
    if (!title || !amount) return;

    if (editData) {
      // update
      await supabase
        .from("transactions")
        .update({ title, amount: parseFloat(amount), category })
        .eq("id", editData.id);
    } else {
      // insert
      await supabase.from("transactions").insert([
        {
          title,
          amount: parseFloat(amount),
          category,
        },
      ]);
    }

    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.form}>
          <Text style={styles.heading}>
            {editData ? "Edit Transaction" : "Add Transaction"}
          </Text>

          <TextInput
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />
          <TextInput
            placeholder="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            placeholder="Category"
            value={category}
            onChangeText={setCategory}
            style={styles.input}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={{ color: "#333" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={saveTransaction}>
              <Text style={{ color: "#fff" }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
  },
  heading: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  cancelBtn: {
    marginRight: 10,
    padding: 10,
    backgroundColor: "#eee",
    borderRadius: 8,
  },
  saveBtn: {
    padding: 10,
    backgroundColor: "#2196F3",
    borderRadius: 8,
  },
});
