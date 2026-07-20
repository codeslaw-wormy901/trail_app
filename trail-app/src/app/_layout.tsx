import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { SelectedRegionProvider } from '@/hooks/use-selected-region';
import { FAVORITES_DB_NAME, migrateDatabase } from '@/lib/database';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <SQLiteProvider databaseName={FAVORITES_DB_NAME} onInit={migrateDatabase}>
      <SelectedRegionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <AppTabs />
        </ThemeProvider>
      </SelectedRegionProvider>
    </SQLiteProvider>
  );
}
