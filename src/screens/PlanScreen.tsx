import { StyleSheet, Text, View } from 'react-native';

export function PlanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Plan</Text>
      <Text style={styles.subtitle}>Planner Agent output will show here</Text>
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
    fontSize: 24,
    fontWeight: '600',
    color: '#F4F7FB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#9AA8BC',
    textAlign: 'center',
  },
});
