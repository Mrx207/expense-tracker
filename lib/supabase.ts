import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl;
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
