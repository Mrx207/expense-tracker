// lib/api.ts
import { supabase } from "./supabase";

export const addTransaction = async ({
  user_id,
  date,
  type,
  category_id,
  subcategory_id,
  amount,
  description,
  source,
}) => {
  const { data, error } = await supabase.from("transactions").insert([
    {
      user_id,
      date,
      type,
      category_id,
      subcategory_id,
      amount,
      description,
      source,
    },
  ]);

  if (error) {
    console.error("Error adding transaction:", error);
    return null;
  }

  return data;
};
