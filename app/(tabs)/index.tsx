import { Image, StyleSheet, Platform, Switch, Pressable, TextInput } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import AsyncStorage, { useAsyncStorage } from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';



TaskManager.defineTask('share-location', async () => {
  const now = Date.now();
  const settings = await AsyncStorage.getItem('settings');
  if (settings && JSON.parse(settings).enabled) {
    const location = await Location.getCurrentPositionAsync({});
    
    fetch(JSON.parse(settings)?.url || '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location,
        timestamp: now,
      }),
    }) 
    return BackgroundFetch.BackgroundFetchResult.NewData;
  }
});



export default function HomeScreen() {
  type Settings = {
    enabled: boolean;
    url?: string;
  };

  const [settings, setSettings] = useState<Settings>({ enabled: false });
  const { getItem, setItem } = useAsyncStorage('settings');
  const [enabledSetting, setEnabledSetting] = useState<boolean>(settings['enabled'] || false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [text, setText] = useState<string>('Locating you...');
  const [url, setURL] = useState<string>(settings['url'] || '');
  
  const storeData = async (key: string, value: any) => {
    try {
      let settings = await getSettings();
      if (settings) {
        settings[key] = value;
      } else {
        settings = { [key]: value };
      }
      const jsonValue = JSON.stringify(settings);
      await setItem(jsonValue);
      setSettings(settings);
    } catch (e) {
      console.error(e)
    }
  };

  const getSettings = async () => {
    try {
      const jsonValue = await getItem();
      const parsed = jsonValue != null ? JSON.parse(jsonValue) : null;
      if (parsed == null) {
        setSettings({ enabled: false });
      }
      return parsed;
    } catch (e) {
      console.error(e)
    }
  };
  
  useEffect(() => {
    getSettings();
    setURL(settings?.url || '');
    setText('Locating you...');
    setEnabledSetting(settings?.enabled || false);
  }, []);

  const getCurrentLocation = async () => {
    if (settings.enabled){
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setText('Permission to access location was denied! Please go to settings and enable location sharing for this app.');
        return;
      }
      
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      setText(`Latitude: ${location.coords.latitude}, Longitude: ${location.coords.longitude}`);
      fetch(settings?.url || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
          timestamp: Date.now(),
        }),
      }) 
    } else {
      setText('Location sharing is disabled');
    }
  }
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const toggleEnabled = async (value: boolean) => {
    await storeData('enabled', value);
    await getCurrentLocation();
    await toggleFetchTask();
  }

  async function registerBackgroundFetchAsync() {
    return BackgroundFetch.registerTaskAsync('share-location', {
      minimumInterval: 60 * 10, // 1 minute
      stopOnTerminate: false, // android only,
      startOnBoot: true, // android only
    });
  }

  async function unregisterBackgroundFetchAsync() {
    return BackgroundFetch.unregisterTaskAsync('share-location');
  }

  const onChangeURL = async (text: string) => {
    await storeData('url', text);
    setURL(text);
  }

  const [isRegistered, setIsRegistered] = useState(false);
  const [status, setStatus] = useState<BackgroundFetch.BackgroundFetchStatus | null>();

  useEffect(() => {
    checkStatusAsync();
  }, []);

  const checkStatusAsync = async () => {
    const status = await BackgroundFetch.getStatusAsync();
    const isRegistered = await TaskManager.isTaskRegisteredAsync('share-location');
    setStatus(status);
    setIsRegistered(isRegistered);
  };

  const toggleFetchTask = async () => {
    if (isRegistered) {
      await unregisterBackgroundFetchAsync();
    } else {
      await registerBackgroundFetchAsync();
    }

    checkStatusAsync();
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
        <ThemedText>
          Background fetch status:{' '}
          <ThemedText type="defaultSemiBold">
            {status && BackgroundFetch.BackgroundFetchStatus[status]}
          </ThemedText>
        </ThemedText>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Locator</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">🗺️Where are you?</ThemedText>
        <ThemedText type="default">{text}</ThemedText>
        </ThemedView>
      <ThemedView style={styles.setting}>
        <ThemedText type="defaultSemiBold">Share Location</ThemedText>
        <Switch onValueChange={toggleEnabled} value={enabledSetting} />
      </ThemedView>
      <ThemedView style={styles.setting}>
        <Pressable onPress={getCurrentLocation}  style={({pressed}) => [
            {
              backgroundColor: pressed ? 'rgb(210, 230, 255)' : 'white',
              color: pressed ? 'rgb(210, 230, 255)' : 'white',
            },
          ]}>
          <ThemedText>Find me!</ThemedText>
        </Pressable>
        </ThemedView>
        <ThemedView style={styles.setting}>
        <ThemedText type="defaultSemiBold">Server URL</ThemedText>
        <TextInput
          style={styles.input}
          onChangeText={onChangeURL}
          value={url}
        />
        </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Platform.OS === 'ios' ? 'systemGray4' : 'rgba(0, 0, 0, 0.12)',
  },
  input: {
    height: 40,
    width: 200,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    color: 'black',
    borderColor: 'white',
    backgroundColor: 'pink'
  },
});
