import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthProvider';
import { View, ActivityIndicator } from 'react-native';

const InitialLayout = () => {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Fix: We check if the current segment is literally the string "auth"
    // We cast segments[0] to string to stop TypeScript from complaining about strict types
    const currentRoute = segments[0] as string;

    const inAuthScreen = currentRoute === 'auth';

    if (!session) {
      // If user is NOT logged in...
      if (!inAuthScreen) {
        // ...and they are not currently on the login screen, kick them there.
        // Fix: Cast the string to 'any' to silence the error
        router.replace('/auth' as any);
      }
    } else if (session) {
      // If user IS logged in...
      if (inAuthScreen) {
        // ...and they try to go to login, send them home.
        router.replace('/(tabs)');
      }
    }
  }, [session, loading, segments]);

  // Show a blank loading screen while we check authentication
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}