import { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) Alert.alert(error.message);
    else Alert.alert('Logged in!');
  };

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) Alert.alert(error.message);
    else Alert.alert('Signup success! Check your email to confirm.');
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <Button title="Login" onPress={handleLogin} />
      <Button title="Sign Up" onPress={handleSignup} />
    </View>
  );
}
