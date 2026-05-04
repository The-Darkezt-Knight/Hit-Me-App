import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from './context/AuthContext';
import Admin from './navigation/screens/admin';
import Home from './navigation/screens/home';
import Login from './navigation/screens/login';
import Profile from './navigation/screens/profile';
import Register from './navigation/screens/register';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0096c7" />
      </View>
    );
  }

  const isAuthed = !!user;
  const initialRouteName = isAuthed ? (user.isAdmin ? 'Admin' : 'Home') : 'Login';
  const stackKey = isAuthed ? (user.isAdmin ? 'admin' : 'user') : 'guest';

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={stackKey}
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false }}
      >
        {isAuthed ? (
          <>
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="Profile" component={Profile} />
            {user.isAdmin ? <Stack.Screen name="Admin" component={Admin} /> : null}
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  }
});