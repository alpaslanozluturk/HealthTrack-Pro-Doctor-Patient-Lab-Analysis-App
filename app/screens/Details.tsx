import { View, Text, ScrollView, StyleSheet } from "react-native";
import React, { useEffect, useState } from "react";
import { FIREBASE_AUTH, FIRESTORE_DB } from "../../FirebaseConfig";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import ranges from "../../ranges";

interface TestResult {
  date: string;
  testname: string;
  result: string;
}

interface GroupedResults {
  [date: string]: TestResult[];
}

interface Patient {
  birthdate: string;
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

const findReferenceRange = (ageInMonths: number, testName: string): string[] => {
    // Helper function to check if age is in range
    const isInRange = (range: string): boolean => {
        if (range === ">216" || range === ">168" || range === ">72") {
            return ageInMonths > parseInt(range.substring(1));
        }
        const [min, max] = range.split("-").map(num => parseInt(num));
        return ageInMonths >= min && ageInMonths <= max;
    };

    const foundRanges: string[] = [];

    // Check in kilavuz-ap
    const apRanges = ranges["kilavuz-ap"] as RangeData[];
    for (const range of apRanges) {
        if (isInRange(range.age_months) && range[testName]) {
            foundRanges.push(range[testName] as string);
        }
    }

    // Check in kilavuz-cilv
    const cilvRanges = ranges["kilavuz-cilv"];
    if (["IgG", "IgA", "IgM"].includes(testName)) {
        const gamRanges = cilvRanges.GAM as GAMRange[];
        for (const range of gamRanges) {
            if (isInRange(range.age_months) && range[testName]) {
                foundRanges.push(range[testName]);
            }
        }
    } else if (["IgG1", "IgG2", "IgG3", "IgG4"].includes(testName)) {
        const subRanges = cilvRanges.G1G2G3G4 as G1G2G3G4Range[];
        for (const range of subRanges) {
            if (isInRange(range.age_months) && range[testName]) {
                foundRanges.push(range[testName]);
            }
        }
    }

    return foundRanges.length > 0 ? foundRanges : ["No reference range found"];
};

const Details = () => {
    const [groupedTestResults, setGroupedTestResults] = useState<GroupedResults>({});
    const [loading, setLoading] = useState(true);
    const [ageInMonths, setAgeInMonths] = useState<number | null>(null);

    useEffect(() => {
        const fetchTestResults = async () => {
            try {
                const currentUser = FIREBASE_AUTH.currentUser;
                if (!currentUser?.email) return;

                const testResultsRef = collection(FIRESTORE_DB, "testresults");
                const q = query(
                    testResultsRef,
                    where("email", "==", currentUser.email),
                    orderBy("date", "desc")
                );

                const querySnapshot = await getDocs(q);
                const results: GroupedResults = {};

                querySnapshot.forEach((doc) => {
                    const data = doc.data() as TestResult;
                    if (!results[data.date]) {
                        results[data.date] = [];
                    }
                    results[data.date].push(data);
                });

                setGroupedTestResults(results);
            } catch (error) {
                console.error("Error fetching test results:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchPatientBirthdate = async () => {
            try {
                const currentUser = FIREBASE_AUTH.currentUser;
                if (!currentUser?.email) return;

                const patientsRef = collection(FIRESTORE_DB, "patients");
                const q = query(patientsRef, where("email", "==", currentUser.email));

                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const patientDoc = querySnapshot.docs[0];
                    const patientData = patientDoc.data() as Patient;
                    
                    // Parse DD.MM.YYYY format
                    const [day, month, year] = patientData.birthdate.split('.').map(num => parseInt(num));
                    const birthdate = new Date(year, month - 1, day);
                    
                    const today = new Date();
                    const ageInMonths = (today.getFullYear() - birthdate.getFullYear()) * 12 + 
                                      (today.getMonth() - birthdate.getMonth()) -
                                      (today.getDate() < birthdate.getDate() ? 1 : 0); // Adjust for day of month
                    
                    setAgeInMonths(ageInMonths);
                }
            } catch (error) {
                console.error("Error fetching patient birthdate:", error);
            }
        };

        fetchPatientBirthdate();
        fetchTestResults();
    }, []);

    const renderTestResult = (result: TestResult) => {
        const referenceRanges = ageInMonths ? findReferenceRange(ageInMonths, result.testname) : ["Calculating..."];
        const currentValue = parseFloat(result.result);
        
        const getStatusArrow = (min: number, max: number, value: number): string => {
            if (isNaN(value) || isNaN(min) || isNaN(max)) return "";
            if (value < min) return "↓";  // down arrow for low
            if (value > max) return "↑";   // up arrow for high
            return "";                     // no arrow for normal
        };

        const renderReferenceRange = (range: string, index: number) => {
            if (range === "No reference range found" || range === "Calculating...") {
                return <Text key={index} style={styles.referenceRange}>Reference: {range}</Text>;
            }

            const [min, max] = range.split("-").map(val => parseFloat(val));
            const arrow = getStatusArrow(min, max, currentValue);
            
            return (
                <Text key={index} style={styles.referenceRange}>
                    Reference {index + 1}: {range} {" "}
                    {arrow && (
                        <Text style={[
                            styles.arrow,
                            arrow === "↑" ? styles.highArrow : styles.lowArrow
                        ]}>
                            {arrow}
                        </Text>
                    )}
                </Text>
            );
        };

        return (
            <View style={styles.testResult}>
                <View style={styles.testInfo}>
                    <Text style={styles.testName}>{result.testname}</Text>
                    <Text style={styles.testValue}>{result.result}</Text>
                </View>
                <View style={styles.referenceContainer}>
                    {referenceRanges.map((range, index) => renderReferenceRange(range, index))}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Yükleniyor...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {ageInMonths !== null && (
                <Text style={styles.ageText}>Age: {ageInMonths} months</Text>
            )}
            {Object.keys(groupedTestResults).length === 0 ? (
                <Text style={styles.noData}>Test sonucu bulunamadı.</Text>
            ) : (
                Object.entries(groupedTestResults).map(([date, results]) => (
                    <View key={date} style={styles.dateGroup}>
                        <Text style={styles.dateHeader}>{date}</Text>
                        {results.map((result, index) => (
                            <View key={index}>
                                {renderTestResult(result)}
                            </View>
                        ))}
                    </View>
                ))
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    dateGroup: {
        marginBottom: 20,
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    dateHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
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
        fontSize: 16,
        color: '#444',
    },
    testValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#222',
    },
    referenceContainer: {
        marginTop: 4,
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
    referenceRange: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    noData: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        marginTop: 20,
    },
    ageText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    }
});

export default Details;