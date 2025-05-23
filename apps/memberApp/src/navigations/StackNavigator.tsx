import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';
import Login from '../screens/Auth/Login';
import Register from '../screens/Auth/Register';
import ColorVision from '../screens/ColorVision/ColorVision';
import EyeTiredness from '../screens/EyeTiredness/EyeTiredness';
import DistanceMeasureWithProvider from '../screens/LandoltC/DistanceMeasure';
import LandoltC from '../screens/LandoltC/LandoltC';
import About from '../screens/Settings/About';
import Help from '../screens/Settings/Help';
import Language from '../screens/Settings/Language';
import Profile from '../screens/Settings/Profile';
import TabNavigator from './TabNavigator';
import ETDistanceMeasureWithProvider from '../screens/EyeTiredness/ETDistanceMeasure';
import DotTrackingWithProvider from '../screens/EyeTiredness/DotTracking';

const Stack = createNativeStackNavigator();

const StackNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Tab"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="Tab" component={TabNavigator} />
      <Stack.Screen name="LandoltC" component={LandoltC} />
      <Stack.Screen
        name="DistanceMeasure"
        component={DistanceMeasureWithProvider}
      />
      <Stack.Screen
        name="ETDistanceMeasure"
        component={ETDistanceMeasureWithProvider}
      />
      <Stack.Screen name="DotTracking" component={DotTrackingWithProvider} />
      <Stack.Screen name="EyeTiredness" component={EyeTiredness} />
      <Stack.Screen name="ColorVision" component={ColorVision} />
      <Stack.Screen name="About" component={About} />
      <Stack.Screen name="Help" component={Help} />
      <Stack.Screen name="Language" component={Language} />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Register} />
    </Stack.Navigator>
  );
};

export default StackNavigator;
