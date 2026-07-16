import { StyleSheet, Text, View } from 'react-native';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CoachOS</Text>
      <Text style={styles.subtitle}>Your autonomous fitness operating system</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0B1220',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F4F7FB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9AA8BC',
    textAlign: 'center',
  },
});
