import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getApiBaseUrl, setApiBaseUrl, SERVER_PRESETS } from '../api/config';
import { checkServerHealth, mobileApiRequest } from '../api/client';
import { CompanySettings } from '../types';

interface SettingsScreenProps {
  onServerConfigChanged: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onServerConfigChanged }) => {
  const [currentUrl, setCurrentUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [pingResult, setPingResult] = useState<{ online: boolean; message: string; version?: string } | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const url = await getApiBaseUrl();
    setCurrentUrl(url);
    runTest(url);
    try {
      const comp = await mobileApiRequest('/company');
      setCompany(comp);
    } catch {}
  };

  const runTest = async (urlToTest?: string) => {
    setTesting(true);
    setPingResult(null);
    if (urlToTest) {
      await setApiBaseUrl(urlToTest);
    }
    const res = await checkServerHealth();
    setPingResult(res);
    setTesting(false);
    onServerConfigChanged();
  };

  const handleSelectPreset = async (presetUrl: string) => {
    setCurrentUrl(presetUrl);
    await setApiBaseUrl(presetUrl);
    runTest(presetUrl);
  };

  const handleSaveCustom = async () => {
    if (!currentUrl.trim()) {
      Alert.alert('Invalid URL', 'Please enter a valid server URL');
      return;
    }
    await setApiBaseUrl(currentUrl);
    runTest(currentUrl);
    Alert.alert('Saved', 'Server connection URL updated.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Connection Status Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>BACKEND SERVER CONNECTIVITY</Text>

        <View style={styles.statusBox}>
          <View style={styles.statusLeft}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: pingResult?.online ? '#10b981' : '#ef4444' },
              ]}
            />
            <View>
              <Text style={styles.statusTitle}>
                {testing ? 'Testing connection...' : pingResult?.online ? 'Connected to ERP Engine' : 'Offline / Host Unreachable'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {pingResult?.online ? `Param Pharma Server v${pingResult.version || '1.0'}` : pingResult?.message || 'Check host IP'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.pingBtn}
            onPress={() => runTest()}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <Ionicons name="refresh" size={16} color="#0f172a" />
            )}
          </TouchableOpacity>
        </View>

        {/* Server IP Presets */}
        <Text style={styles.inputLabel}>QUICK SERVER IP PRESETS:</Text>
        <View style={styles.presetsList}>
          {SERVER_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.url}
              style={[
                styles.presetBtn,
                currentUrl === p.url && styles.presetBtnActive,
              ]}
              onPress={() => handleSelectPreset(p.url)}
            >
              <Text
                style={[
                  styles.presetBtnText,
                  currentUrl === p.url && styles.presetBtnTextActive,
                ]}
              >
                {p.label}
              </Text>
              <Text
                style={[
                  styles.presetBtnUrl,
                  currentUrl === p.url && styles.presetBtnUrlActive,
                ]}
              >
                {p.url}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom URL Input */}
        <Text style={styles.inputLabel}>CUSTOM SERVER URL / LAN IP:</Text>
        <View style={styles.customRow}>
          <TextInput
            style={styles.urlInput}
            value={currentUrl}
            onChangeText={setCurrentUrl}
            placeholder="http://192.168.1.x:8000/api"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCustom}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Business Details & Statutory Info */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>COMPANY PROFILE & STATUTORY CONFIG</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Company Name:</Text>
          <Text style={styles.infoVal}>{company?.company_name || 'PARAM PHARMA'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Jurisdiction:</Text>
          <Text style={styles.infoVal}>Bhuj, Kutch (Gujarat) - 370001</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>GSTIN:</Text>
          <Text style={styles.infoVal}>{company?.gstin || '24AABCP1234F1Z5'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Drug Licenses:</Text>
          <Text style={styles.infoVal}>{company?.dl_number_20b || 'GUJ-DL-20B-12345'} / {company?.dl_number_21b || '21B-12346'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Active UPI VPA:</Text>
          <Text style={[styles.infoVal, { color: '#2563eb', fontWeight: '800' }]}>
            {company?.upi_id || 'aldholakia72@okicici'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Contact Mobile:</Text>
          <Text style={styles.infoVal}>{company?.phone || '9429041051'}</Text>
        </View>
      </View>

      {/* App Architecture Spec */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>APP ARCHITECTURE SPECIFICATION</Text>
        <Text style={styles.specText}>
          • Client: React Native Expo 58 with Hermes Engine{'\n'}
          • Authoritative Business Engine: Python FastAPI Backend{'\n'}
          • Sync Strategy: Live FIFO Costing & Double-Entry Accounting{'\n'}
          • Zero Cloud Cost: ₹0/month budget footprint{'\n'}
          • Hardware Target: Optimized for entry-level Android devices
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  statusBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 12,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  pingBtn: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 4,
  },
  presetsList: {
    gap: 6,
    marginBottom: 12,
  },
  presetBtn: {
    padding: 10,
    borderRadius: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetBtnActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  presetBtnTextActive: {
    color: '#ffffff',
  },
  presetBtnUrl: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  presetBtnUrlActive: {
    color: '#94a3b8',
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#ffffff',
  },
  saveBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  infoLabel: {
    fontSize: 12,
    color: '#475569',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  specText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 18,
  },
});
