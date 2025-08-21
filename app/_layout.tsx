import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { Platform } from "react-native";

import { useColorScheme } from "@/hooks/useColorScheme";

// Custom theme configuration
const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#007AFF',
    background: '#f8f9fa',
    card: '#ffffff',
    text: '#000000',
    border: '#e1e1e1',
    notification: '#007AFF',
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#0A84FF',
    background: '#000000',
    card: '#1c1c1e',
    text: '#ffffff',
    border: '#38383a',
    notification: '#0A84FF',
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    return null;
  }

  const theme = colorScheme === "dark" ? CustomDarkTheme : CustomLightTheme;

  return (
    <ThemeProvider value={theme}>
      <Stack
        screenOptions={{
          // Default screen options for all screens
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          headerShadowVisible: Platform.OS === 'ios',
          animation: 'slide_from_right', // Smooth transitions
        }}
      >
        {/* Home Screen */}
        <Stack.Screen 
          name="index" 
          options={{ 
            headerShown: false,
            title: "Dashboard"
          }} 
        />

        {/* Transaction Screens */}
        <Stack.Screen
          name="transactions/add-transaction"
          options={{
            title: "Add Transaction",
            presentation: 'modal', // Modal presentation for add screen
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerLeft: undefined, // Remove back button for modal
          }}
        />
        
        <Stack.Screen
          name="transactions/transactions-list"
          options={{
            title: "Transactions",
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerBackTitle: "Back", // Custom back title
            headerLargeTitle: Platform.OS === 'ios', // Large title on iOS
          }}
        />

        {/* Categories Management (Future screens) */}
        <Stack.Screen
          name="categories/index"
          options={{
            title: "Categories",
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        />

        <Stack.Screen
          name="categories/add-category"
          options={{
            title: "Add Category",
            presentation: 'modal',
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        />

        {/* Analytics Screen (Future) */}
        <Stack.Screen
          name="analytics/index"
          options={{
            title: "Analytics",
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        />

        {/* Settings Screen (Future) */}
        <Stack.Screen
          name="settings/index"
          options={{
            title: "Settings",
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        />

        {/* Profile Screen (Future) */}
        <Stack.Screen
          name="profile/index"
          options={{
            title: "Profile",
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        />

        {/* Export/Import Screen (Future) */}
        <Stack.Screen
          name="data/export"
          options={{
            title: "Export Data",
            presentation: 'modal',
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        />

        {/* Not Found */}
        <Stack.Screen 
          name="+not-found" 
          options={{
            title: "Page Not Found",
          }}
        />
      </Stack>
      
      <StatusBar 
        style={colorScheme === 'dark' ? 'light' : 'dark'} 
        backgroundColor={theme.colors.background}
        translucent={false}
      />
    </ThemeProvider>
  );
}