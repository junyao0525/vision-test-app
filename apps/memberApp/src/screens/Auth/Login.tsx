// screens/Login.tsx
import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {useForm} from 'react-hook-form';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from 'react-native';
import InputField from '../../components/InputField';
import {Colors, TextStyle} from '../../themes';
import {useAuth} from '../../providers/AuthProvider';
import LoadingOverlay from '../../components/Loading';

type FormData = {
  email: string;
  password: string;
};

const Login = () => {
  const navigation = useNavigation();
  const {login} = useAuth();
  const [loading, setLoading] = useState(false);
  const {control, handleSubmit} = useForm<FormData>({
    defaultValues: {email: '', password: ''},
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data);
      // navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (err) {
      Alert.alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = useCallback(() => {
    navigation.navigate('Register' as never);
  }, []);

  return (
    <>
      <View style={styles.container}>
        <Text style={[TextStyle.H1, styles.mainText]}>
          Sign in to your Account
        </Text>
        <Text style={styles.secondText}>
          Enter your email and password to login.
        </Text>
        <InputField
          containerStyle={{paddingBottom: 10}}
          label="Email"
          control={control}
          name="email"
        />
        <InputField
          containerStyle={{paddingBottom: 10}}
          label="Password"
          control={control}
          name="password"
        />
        <TouchableOpacity style={{alignSelf: 'flex-end', paddingVertical: 10}}>
          <Text style={[TextStyle.P2, {color: Colors.forgetPassword}]}>
            Forget Password?
          </Text>
        </TouchableOpacity>
        <View style={styles.buttonContainer}>
          <TouchableHighlight
            onPress={handleSubmit(onSubmit)}
            underlayColor="white">
            <Text
              style={[
                TextStyle.P1B,
                {
                  backgroundColor: Colors.primary,
                  color: Colors.white,
                  paddingVertical: 10,
                  textAlign: 'center',
                  borderRadius: 5,
                },
              ]}>
              {'Log in'}
            </Text>
          </TouchableHighlight>
          <View style={styles.signUpRow}>
            <Text style={{fontSize: 18}}>Don’t have an account?</Text>
            <TouchableOpacity onPress={onSignUp}>
              <Text style={{color: Colors.primary, fontSize: 18}}>
                {' '}
                Sign up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <LoadingOverlay visible={loading} />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 20,
  },
  mainText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 10,
  },
  secondText: {
    paddingVertical: 20,
    fontSize: 14,
    color: Colors.darkGreen,
  },
  buttonContainer: {
    marginTop: 10,
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
  },
});

export default Login;
