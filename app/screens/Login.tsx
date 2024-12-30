import { View, Text, StyleSheet, TextInput, ActivityIndicator, Button, KeyboardAvoidingView, TouchableOpacity, Alert, Platform } from "react-native";
import React, { useState } from "react";
import { FIREBASE_APP, FIREBASE_AUTH, FIRESTORE_DB } from "../../FirebaseConfig";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, setDoc, doc } from "firebase/firestore";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

type GenderType = "Erkek" | "Kadın" | "";

const Login = () => {
    const [activeTab, setActiveTab] = useState('login'); // 'login' or 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [birthdate, setBirthdate] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [gender, setGender] = useState<GenderType>('');
    const [loading, setLoading] = useState(false);
    const auth = FIREBASE_AUTH;
    const db = FIRESTORE_DB;

    const formatDate = (date: Date): string => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
            setBirthdate(formatDate(selectedDate));
        }
    };

    const signIn = async () => {
        if (!email || !password) {
            Alert.alert('Hata', 'Email ve şifre alanları boş olamaz.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
            return;
        }

        setLoading(true);
        try {
            const response = await signInWithEmailAndPassword(auth, email, password);
            if (!response.user) {
                Alert.alert('Hata', 'Giriş yapılamadı. Lütfen tekrar deneyin.');
            }
        } catch (error: any) {
            let errorMessage = 'Giriş başarısız: ';
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage += 'Geçersiz email adresi.';
                    break;
                case 'auth/user-disabled':
                    errorMessage += 'Bu hesap devre dışı bırakılmış.';
                    break;
                case 'auth/user-not-found':
                    errorMessage += 'Bu email adresi ile kayıtlı kullanıcı bulunamadı.';
                    break;
                case 'auth/wrong-password':
                    errorMessage += 'Yanlış şifre.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage += 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.';
                    break;
                default:
                    errorMessage += error.message;
            }
            Alert.alert('Hata', errorMessage);
            // Reset auth state
            await auth.signOut();
        } finally {
            setLoading(false);
        }
    }

    const signUp = async () => {
        if (!email || !password || !name || !birthdate || !gender) {
            Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
            return;
        }

        setLoading(true);
        try {
            // Create user authentication
            const response = await createUserWithEmailAndPassword(auth, email, password);
            
            if (!response.user) {
                Alert.alert('Hata', 'Kayıt yapılamadı. Lütfen tekrar deneyin.');
                return;
            }

            // Convert gender to single letter format
            const genderCode = gender === 'Erkek' ? 'E' : 'K';
            
            try {
                // Add user data to Firestore
                await setDoc(doc(db, "patients", response.user.uid), {
                    name: name,
                    email: email,
                    birthdate: birthdate,
                    gender: genderCode
                });

                Alert.alert('Başarılı', 'Kayıt işlemi tamamlandı!');
                setActiveTab('login');
            } catch (firestoreError) {
                // If Firestore save fails, delete the auth user
                await response.user.delete();
                Alert.alert('Hata', 'Kullanıcı bilgileri kaydedilemedi. Lütfen tekrar deneyin.');
                await auth.signOut();
            }
        } catch (error: any) {
            let errorMessage = 'Kayıt başarısız: ';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage += 'Bu email adresi zaten kullanımda.';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Geçersiz email adresi.';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage += 'Email/şifre girişi devre dışı bırakılmış.';
                    break;
                case 'auth/weak-password':
                    errorMessage += 'Şifre çok zayıf.';
                    break;
                default:
                    errorMessage += error.message;
            }
            Alert.alert('Hata', errorMessage);
            // Reset auth state
            await auth.signOut();
        } finally {
            setLoading(false);
        }
    }

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'login' && styles.activeTab]}
                onPress={() => setActiveTab('login')}
            >
                <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>Giriş</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
                onPress={() => setActiveTab('signup')}
            >
                <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>Kayıt Ol</Text>
            </TouchableOpacity>
        </View>
    );

    const renderLoginForm = () => (
        <>
            <TextInput
                value={email}
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                onChangeText={(text) => setEmail(text)}
            />
            <TextInput
                secureTextEntry={true}
                value={password}
                style={styles.input}
                placeholder="Şifre"
                autoCapitalize="none"
                onChangeText={(text) => setPassword(text)}
            />
            <TouchableOpacity 
                style={styles.button}
                onPress={signIn}
                disabled={loading}
            >
                <Text style={styles.buttonText}>Giriş Yap</Text>
            </TouchableOpacity>
        </>
    );

    const renderSignUpForm = () => (
        <>
            <TextInput
                value={name}
                style={styles.input}
                placeholder="Ad Soyad"
                onChangeText={(text) => setName(text)}
            />
            <TextInput
                value={email}
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                onChangeText={(text) => setEmail(text)}
            />
            <TextInput
                secureTextEntry={true}
                value={password}
                style={styles.input}
                placeholder="Şifre"
                autoCapitalize="none"
                onChangeText={(text) => setPassword(text)}
            />
            <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
            >
                <Text style={[styles.dateText, !birthdate && styles.placeholderText]}>
                    {birthdate || "Doğum Tarihi Seçin"}
                </Text>
            </TouchableOpacity>
            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                />
            )}
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={gender}
                    onValueChange={(itemValue: GenderType) => setGender(itemValue)}
                    style={styles.picker}
                >
                    <Picker.Item label="Cinsiyet Seçin" value="" />
                    <Picker.Item label="Erkek" value="Erkek" />
                    <Picker.Item label="Kadın" value="Kadın" />
                </Picker>
            </View>
            <TouchableOpacity 
                style={styles.button}
                onPress={signUp}
                disabled={loading}
            >
                <Text style={styles.buttonText}>Kayıt Ol</Text>
            </TouchableOpacity>
        </>
    );

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior="padding">
                {renderTabs()}
                <View style={styles.formContainer}>
                    {loading ? (
                        <ActivityIndicator size="large" color="#0000ff"/>
                    ) : (
                        activeTab === 'login' ? renderLoginForm() : renderSignUpForm()
                    )}
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
        paddingTop: 50, // Added top padding to move tabs down
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        borderRadius: 8,
        backgroundColor: '#e1e1e1',
        overflow: 'hidden',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: '#2196F3',
    },
    tabText: {
        fontSize: 16,
        color: '#666',
    },
    activeTabText: {
        color: 'white',
        fontWeight: 'bold',
    },
    formContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    input: {
        marginVertical: 8,
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#fff',
    },
    button: {
        backgroundColor: '#2196F3',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    pickerContainer: {
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
    },
    dateText: {
        fontSize: 14,
        color: '#000',
        paddingVertical: 4,
    },
    placeholderText: {
        color: '#999',
    },
});

export default Login;