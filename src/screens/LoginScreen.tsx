import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Keyboard, Alert } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import FingerprintScannerComponent from '../components/FingerprintScanner';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { getTheme } from '../theme/theme';
import { ThemedView, ThemedText } from '../components/ThemedView';
import { LinearGradient } from 'expo-linear-gradient';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginSchema = Yup.object().shape({
  email: Yup.string().email('Email inválido').required('Obrigatório'),
  password: Yup.string().min(6, 'Muito curta!').required('Obrigatório'),
});

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  const [useBiometric, setUseBiometric] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<{email: string, password: string} | null>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  // Verificar se existem credenciais salvas para autenticação biométrica
  useEffect(() => {
    checkSavedCredentials();
  }, []);

  const checkSavedCredentials = async () => {
    try {
      const credentials = await AsyncStorage.getItem('savedCredentials');
      if (credentials) {
        setSavedCredentials(JSON.parse(credentials));
        setIsBiometricAvailable(true);
      }
    } catch (error) {
      console.error('Erro ao verificar credenciais salvas:', error);
      setIsBiometricAvailable(false);
    }
  };

  const handleLogin = async (values: { email: string; password: string }) => {
    Keyboard.dismiss(); // Fecha o teclado antes da navegação
    setLoading(true);
    try {
      const response = await axios.post('http://192.168.1.57/app_empresas_api/api.php', {
        action: 'login',
        email: values.email,
        password: values.password
      });
  
      if (response.data.status === 'success') {
        await AsyncStorage.setItem('userToken', JSON.stringify(response.data.empresa));
        
        // Perguntar se deseja salvar as credenciais para login biométrico
        Alert.alert(
          'Autenticação Biométrica',
          'Deseja salvar suas credenciais para login biométrico?',
          [
            {
              text: 'Não',
              style: 'cancel'
            },
            {
              text: 'Sim',
              onPress: async () => {
                try {
                  await AsyncStorage.setItem('savedCredentials', JSON.stringify({
                    email: values.email,
                    password: values.password
                  }));
                  setIsBiometricAvailable(true);
                } catch (error) {
                  console.error('Erro ao salvar credenciais:', error);
                }
              }
            }
          ]
        );
        
        navigation.navigate('Main');
      } else {
        Alert.alert('Erro', response.data.message || 'Falha na autenticação');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Erro ao conectar ao servidor. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricSuccess = async () => {
    // Só tenta fazer login biométrico se houver credenciais salvas
    if (savedCredentials && savedCredentials.email && savedCredentials.password) {
      setLoading(true);
      try {
        const response = await axios.post('http://192.168.1.57/app_empresas_api/api.php', {
          action: 'login',
          email: savedCredentials.email,
          password: savedCredentials.password
        });
        
        if (response.data.status === 'success') {
          await AsyncStorage.setItem('userToken', JSON.stringify(response.data.empresa));
          navigation.navigate('Main');
        } else {
          Alert.alert('Erro', response.data.message || 'Falha na autenticação biométrica');
        }
      } catch (error) {
        console.error('Erro no login biométrico:', error);
        Alert.alert('Erro', 'Erro ao conectar ao servidor. Tente fazer login manualmente.');
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert(
        'Autenticação Biométrica',
        'Nenhuma credencial salva. Por favor, faça login manualmente primeiro.'
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={[theme === 'dark' ? '#1e1e1e' : '#f7f7f7', theme === 'dark' ? '#121212' : '#e9e9e9']}
        style={styles.gradientBackground}
      />
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={false}
      >
        <View style={styles.innerContainer}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
          </View>
          
          <ThemedText style={styles.title} type="title">Bem-vindo de volta</ThemedText>
          <ThemedText style={styles.subtitle} type="secondary">Acesse sua conta para continuar</ThemedText>
          
          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={handleLogin}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel} type="secondary">Email</ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: currentTheme.colors.inputBackground,
                        borderColor: touched.email && errors.email ? '#f44336' : currentTheme.colors.inputBorder,
                        color: currentTheme.colors.text
                      }
                    ]}
                    placeholder="Seu email"
                    placeholderTextColor={currentTheme.colors.textSecondary}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                    value={values.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  {touched.email && errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel} type="secondary">Senha</ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: currentTheme.colors.inputBackground,
                        borderColor: touched.password && errors.password ? '#f44336' : currentTheme.colors.inputBorder,
                        color: currentTheme.colors.text
                      }
                    ]}
                    placeholder="Sua senha"
                    placeholderTextColor={currentTheme.colors.textSecondary}
                    onChangeText={handleChange('password')}
                    onBlur={handleBlur('password')}
                    value={values.password}
                    secureTextEntry
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                  {touched.password && errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}
                </View>

                <TouchableOpacity style={styles.forgotPasswordContainer}>
                  <Text style={[styles.forgotPasswordText, { color: currentTheme.colors.primary }]}>
                    Esqueceu sua senha?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.loginButton, loading && styles.disabledButton]} 
                  onPress={() => handleSubmit()}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Carregando...' : 'Entrar'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Formik>

          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: currentTheme.colors.border }]} />
            <ThemedText style={styles.orText} type="secondary">OU</ThemedText>
            <View style={[styles.divider, { backgroundColor: currentTheme.colors.border }]} />
          </View>

          {isBiometricAvailable && (
            <View style={styles.biometricContainer}>
              <FingerprintScannerComponent onScan={handleBiometricSuccess} />
              <ThemedText style={styles.biometricText} type="secondary">
                Autenticação biométrica disponível
              </ThemedText>
            </View>
          )}

          <TouchableOpacity 
            style={styles.registerContainer}
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
          >
            <Text style={[styles.registerText, { color: currentTheme.colors.textSecondary }]}>
              Não tem uma conta? <Text style={{ color: currentTheme.colors.primary, fontWeight: 'bold' }}>Registre-se</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  formContainer: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#f44336',
    marginTop: 4,
    fontSize: 12,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#3EB489',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#3EB489',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  orText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  biometricContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  biometricText: {
    marginTop: 8,
    fontSize: 14,
  },
  registerContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  registerText: {
    fontSize: 14,
  },
});

export default LoginScreen;