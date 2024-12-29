import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Modal } from "react-native";
import React, { useState, useEffect } from "react";
import { FIREBASE_AUTH, FIRESTORE_DB } from "../../FirebaseConfig";
import { collection, query, getDocs, where, orderBy } from "firebase/firestore";
import ranges from "../../ranges";

interface Patient {
    name: string;
    email: string;
    birthdate: string;
    gender: string;
}

interface TestResult {
    date: string;
    testname: string;
    result: string;
}

interface GroupedResults {
    [date: string]: TestResult[];
}

interface TestTrend {
    current: TestResult;
    previous?: TestResult;
}

interface GroupedTestTrends {
    [testname: string]: TestTrend;
}

interface RangeData {
    age_months: string;
    IgG?: string;
    IgG1?: string;
    IgG2?: string;
    IgG3?: string;
    IgG4?: string;
    IgA?: string;
    IgM?: string;
    [key: string]: string | undefined;
}

interface GAMRange {
    age_months: string;
    IgG: string;
    IgA: string;
    IgM: string;
    [key: string]: string;
}

interface G1G2G3G4Range {
    age_months: string;
    IgG1: string;
    IgG2: string;
    IgG3: string;
    IgG4: string;
    [key: string]: string;
}

interface TestResults {
    [testname: string]: TestResult[];
}

const PatientListScreen = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [testResults, setTestResults] = useState<GroupedResults>({});
    const [testTrends, setTestTrends] = useState<TestResults>({});
    const [modalVisible, setModalVisible] = useState(false);
    const [ageInMonths, setAgeInMonths] = useState<number | null>(null);

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            const patientsRef = collection(FIRESTORE_DB, "patients");
            const q = query(patientsRef, orderBy("name"));
            const querySnapshot = await getDocs(q);
            
            const patientsList: Patient[] = [];
            querySnapshot.forEach((doc) => {
                patientsList.push(doc.data() as Patient);
            });
            
            setPatients(patientsList);
        } catch (error) {
            console.error("Error fetching patients:", error);
        }
    };

    const calculateAge = (birthdate: string): number => {
        const [day, month, year] = birthdate.split('.').map(num => parseInt(num));
        const birthdateObj = new Date(year, month - 1, day);
        const today = new Date();
        const ageInMonths = (today.getFullYear() - birthdateObj.getFullYear()) * 12 + 
                          (today.getMonth() - birthdateObj.getMonth()) -
                          (today.getDate() < birthdateObj.getDate() ? 1 : 0);
        return ageInMonths;
    };

    const processTestTrends = (results: GroupedResults) => {
        const trends: TestResults = {};
        
        // First, collect all results for each test type
        Object.values(results).forEach(dateResults => {
            dateResults.forEach(result => {
                if (!trends[result.testname]) {
                    trends[result.testname] = [];
                }
                trends[result.testname].push(result);
            });
        });

        // Sort each test type's results by date
        Object.keys(trends).forEach(testname => {
            trends[testname].sort((a, b) => {
                const [dayA, monthA, yearA] = a.date.split('.').map(num => parseInt(num));
                const [dayB, monthB, yearB] = b.date.split('.').map(num => parseInt(num));
                const dateA = new Date(yearA, monthA - 1, dayA);
                const dateB = new Date(yearB, monthB - 1, dayB);
                return dateB.getTime() - dateA.getTime();
            });
        });

        return trends;
    };

    const getTrendArrow = (currentResult: TestResult, allResults: TestResult[]): string | null => {
        const currentIndex = allResults.findIndex(r => r.date === currentResult.date && r.result === currentResult.result);
        if (currentIndex === -1 || currentIndex === allResults.length - 1) return null;

        const currentValue = parseFloat(currentResult.result.replace(",", "."));
        const previousValue = parseFloat(allResults[currentIndex + 1].result.replace(",", "."));
        
        if (isNaN(currentValue) || isNaN(previousValue)) return null;
        if (currentValue > previousValue) return "↑";
        if (currentValue < previousValue) return "↓";
        return "⇔";
    };

    const fetchPatientTestResults = async (patientEmail: string, birthdate: string) => {
        try {
            const testResultsRef = collection(FIRESTORE_DB, "testresults");
            const q = query(
                testResultsRef,
                where("email", "==", patientEmail),
                orderBy("date", "desc")
            );

            const querySnapshot = await getDocs(q);
            const results: GroupedResults = {};

            // First, collect all results
            querySnapshot.forEach((doc) => {
                const data = doc.data() as TestResult;
                if (!results[data.date]) {
                    results[data.date] = [];
                }
                results[data.date].push(data);
            });

            // Sort dates in descending order (newest first)
            const sortedDates = Object.keys(results).sort((a, b) => {
                const [dayA, monthA, yearA] = a.split('.').map(num => parseInt(num));
                const [dayB, monthB, yearB] = b.split('.').map(num => parseInt(num));
                const dateA = new Date(yearA, monthA - 1, dayA);
                const dateB = new Date(yearB, monthB - 1, dayB);
                return dateB.getTime() - dateA.getTime();
            });

            // Create a new sorted results object
            const sortedResults: GroupedResults = {};
            sortedDates.forEach(date => {
                // Sort test results within each date by test name
                sortedResults[date] = results[date].sort((a, b) => 
                    a.testname.localeCompare(b.testname)
                );
            });

            const trends = processTestTrends(sortedResults);
            setTestResults(sortedResults);
            setTestTrends(trends);
            setAgeInMonths(calculateAge(birthdate));
            setModalVisible(true);
        } catch (error) {
            console.error("Error fetching test results:", error);
        }
    };

    const findReferenceRange = (ageInMonths: number, testName: string): { source: string; range: string }[] => {
        const isInRange = (range: string): boolean => {
            if (range === ">216" || range === ">168" || range === ">72") {
                return ageInMonths > parseInt(range.substring(1));
            }
            const [min, max] = range.split("-").map(num => parseInt(num));
            return ageInMonths >= min && ageInMonths <= max;
        };

        const foundRanges: { source: string; range: string }[] = [];

        // Check in kilavuz-ap
        const apRanges = ranges["kilavuz-ap"] as RangeData[];
        for (const range of apRanges) {
            if (isInRange(range.age_months) && range[testName]) {
                foundRanges.push({ source: "ap", range: range[testName] as string });
            }
        }

        // Check in kilavuz-medsci
        const medsciRanges = ranges["kilavuz-medsci"] as RangeData[];
        for (const range of medsciRanges) {
            if (isInRange(range.age_months) && range[testName]) {
                foundRanges.push({ source: "medsci", range: range[testName] as string });
            }
        }

        // Check in kilavuz-tjp
        const tjpRanges = ranges["kilavuz-tjp"] as RangeData[];
        for (const range of tjpRanges) {
            if (isInRange(range.age_months) && range[testName]) {
                foundRanges.push({ source: "tjp", range: range[testName] as string });
            }
        }

        // Check in kilavuz-cilv
        const cilvRanges = ranges["kilavuz-cilv"];
        if (["IgG", "IgA", "IgM"].includes(testName)) {
            const gamRanges = cilvRanges.GAM as GAMRange[];
            for (const range of gamRanges) {
                if (isInRange(range.age_months) && range[testName]) {
                    foundRanges.push({ source: "cilv", range: range[testName] });
                }
            }
        } else if (["IgG1", "IgG2", "IgG3", "IgG4"].includes(testName)) {
            const subRanges = cilvRanges.G1G2G3G4 as G1G2G3G4Range[];
            for (const range of subRanges) {
                if (isInRange(range.age_months) && range[testName]) {
                    foundRanges.push({ source: "cilv", range: range[testName] });
                }
            }
        }

        return foundRanges.length > 0 ? foundRanges : [{ source: "none", range: "No reference range found" }];
    };

    const renderTestResult = (result: TestResult, date: string, index: number) => {
        const referenceRanges = ageInMonths ? findReferenceRange(ageInMonths, result.testname) : [{ source: "none", range: "Calculating..." }];
        const currentValue = parseFloat((result.result).replace(",", '.'));
        
        const getStatusArrow = (min: number, max: number, value: number): string => {
            if (isNaN(value) || isNaN(min) || isNaN(max)) return "";
            if (value < min) return "↓";
            if (value > max) return "↑";
            return "⇔";
        };

        const renderReferenceRange = (referenceData: { source: string; range: string }, refIndex: number) => {
            if (referenceData.source === "none") {
                return <Text key={`${date}-${index}-ref-${refIndex}`} style={styles.referenceRange}>Reference: {referenceData.range}</Text>;
            }

            const [min, max] = referenceData.range.split("-").map(val => parseFloat(val));
            const arrow = getStatusArrow(min, max, currentValue);
            
            return (
                <Text key={`${date}-${index}-ref-${refIndex}`} style={styles.referenceRange}>
                    Referans {referenceData.source}: {referenceData.range} {" "}
                    {arrow && (
                        <Text style={[
                            styles.arrow,
                            arrow === "↑" ? styles.highArrow : arrow === "↓" ? styles.lowArrow : styles.twoSidedArrow
                        ]}>
                            {arrow}
                        </Text>
                    )}
                </Text>
            );
        };

        const trendArrow = getTrendArrow(result, testTrends[result.testname] || []);

        return (
            <View key={`${date}-${index}`} style={styles.testResult}>
                <View style={styles.testInfo}>
                    <Text style={styles.testName}>{result.testname}</Text>
                    <View style={styles.valueContainer}>
                        <Text style={styles.testValue}>{result.result}</Text>
                        {trendArrow && (
                            <Text style={[
                                styles.trendArrow,
                                trendArrow === "↑" ? styles.highArrow : 
                                trendArrow === "↓" ? styles.lowArrow : 
                                styles.twoSidedArrow
                            ]}>
                                {" "}{trendArrow}
                            </Text>
                        )}
                    </View>
                </View>
                <View style={styles.referenceContainer}>
                    {referenceRanges.map((range, refIndex) => renderReferenceRange(range, refIndex))}
                </View>
            </View>
        );
    };

    const filteredPatients = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderPatientItem = ({ item }: { item: Patient }) => (
        <View style={styles.patientItem}>
            <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{item.name}</Text>
                <Text style={styles.patientDetails}>
                    {item.birthdate} | {item.gender}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.viewButton}
                onPress={() => {
                    setSelectedPatient(item);
                    fetchPatientTestResults(item.email, item.birthdate);
                }}
            >
                <Text style={styles.viewButtonText}>Sonuçlar</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.searchInput}
                placeholder="Hasta Ara..."
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            
            <FlatList
                data={filteredPatients}
                renderItem={renderPatientItem}
                keyExtractor={(item) => item.email}
                style={styles.list}
            />

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalView}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {selectedPatient?.name} - Test Sonuçları
                            </Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {ageInMonths !== null && (
                            <Text style={styles.ageText}>Yaş: {ageInMonths} ay</Text>
                        )}

                        <FlatList
                            data={Object.entries(testResults)}
                            renderItem={({ item: [date, results] }) => (
                                <View key={date} style={styles.dateGroup}>
                                    <Text style={styles.dateHeader}>{date}</Text>
                                    {results.map((result, index) => renderTestResult(result, date, index))}
                                </View>
                            )}
                            keyExtractor={([date]) => date}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    searchInput: {
        height: 40,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
        backgroundColor: 'white',
    },
    list: {
        flex: 1,
        marginBottom: 16,
    },
    patientItem: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 16,
        marginBottom: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    patientInfo: {
        flex: 1,
    },
    patientName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    patientDetails: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    viewButton: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        marginLeft: 12,
    },
    viewButtonText: {
        color: 'white',
        fontWeight: '500',
    },
    modalView: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 8,
    },
    closeButtonText: {
        fontSize: 20,
        color: '#666',
        fontWeight: 'bold',
    },
    dateGroup: {
        marginBottom: 16,
        backgroundColor: '#f8f8f8',
        padding: 12,
        borderRadius: 8,
    },
    dateHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#444',
    },
    testResult: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    testInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    testName: {
        fontSize: 14,
        color: '#555',
    },
    testValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    referenceContainer: {
        marginTop: 4,
    },
    referenceRange: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    arrow: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    highArrow: {
        color: '#e74c3c',  // red for high
    },
    lowArrow: {
        color: '#2ecc71',  // green for low
    },
    twoSidedArrow: {
        color: '#00008B',  // blue for normal
    },
    ageText: {
        textAlign: 'center',
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    valueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trendArrow: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 4,
    },
});

export default PatientListScreen; 