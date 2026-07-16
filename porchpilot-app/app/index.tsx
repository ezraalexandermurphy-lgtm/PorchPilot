import { Redirect } from 'expo-router';

// Root index - redirect to auth (splash) flow
// In the future, this can check auth state and redirect accordingly
export default function RootIndex() {
  // TODO: Implement auth check - redirect to (tabs) if already connected
  return <Redirect href="/(auth)/splash" />;
}
