import { View, Text, Button, Modal, StyleSheet, TouchableOpacity } from "react-native";
import React, { useState, useEffect } from "react";
import { NavigationProp } from "@react-navigation/native";
import { FIREBASE_AUTH, FIRESTORE_DB } from "../../FirebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

interface RouterProps {
    navigation: NavigationProp<any, any>;
}

interface PatientInfo {
    name: string;
    birthdate: string;
    gender: string;
    email: string;
}

const List = ({navigation}: RouterProps) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);

    const fetchPatientInfo = async () => {
        try {
            const currentUser = FIREBASE_AUTH.currentUser;
            if (!currentUser?.email) return;

            const patientsRef = collection(FIRESTORE_DB, "patients");
            const q = query(patientsRef, where("email", "==", currentUser.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const patientDoc = querySnapshot.docs[0];
                const data = patientDoc.data() as PatientInfo;
                setPatientInfo(data);
            }
        } catch (error) {
            console.error("Error fetching patient info:", error);
        }
    };

    useEffect(() => {
        fetchPatientInfo();
    }, []);

    return (
        <View style={styles.container}>
            <Button onPress={() => navigation.navigate('Detaylar')} title="Detaylar"/>
            <Button onPress={() => setModalVisible(true)} title="Profil"/>
            <Button onPress={() => FIREBASE_AUTH.signOut()} title="Çıkış Yap"/>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Hasta Bilgileri</Text>
                        {patientInfo ? (
                            <>
                                <Text style={styles.modalText}>Ad: {patientInfo.name}</Text>
                                <Text style={styles.modalText}>Doğum Tarihi: {patientInfo.birthdate}</Text>
                                <Text style={styles.modalText}>Cinsiyet: {patientInfo.gender}</Text>
                                <Text style={styles.modalText}>Email: {patientInfo.email}</Text>
                            </>
                        ) : (
                            <Text style={styles.modalText}>Yükleniyor...</Text>
                        )}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Kapat</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'left',
        alignSelf: 'stretch',
        fontSize: 16,
        color: '#444',
    },
    closeButton: {
        backgroundColor: '#2196F3',
        borderRadius: 20,
        padding: 10,
        elevation: 2,
        marginTop: 10,
        minWidth: 100,
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default List