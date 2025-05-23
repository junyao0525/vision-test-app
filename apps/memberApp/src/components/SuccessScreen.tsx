import React from 'react';
import {View, Text, StyleSheet, Button} from 'react-native';
import {useNavigation} from '@react-navigation/native'; // For navigation
import {Colors} from '../themes';
type Props = {
  successMessage: string;
  targetScreen: string;
};
const SuccessPage = ({successMessage, targetScreen}: Props) => {
  const navigation = useNavigation();

  const handleRedirect = () => {
    navigation.navigate(targetScreen as never); // Redirect to the target screen
  };

  return (
    <View style={styles.container}>
      <Text style={styles.successText}>{successMessage}</Text>
      <Button title="Go to Next Screen" onPress={handleRedirect} />
    </View>
  );
};

export default SuccessPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.backgroundColor,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
    textAlign: 'center',
  },
});
