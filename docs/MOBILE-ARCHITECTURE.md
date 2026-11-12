# Param Pharma — Future Android Mobile Architecture
**Document Version:** 1.0.0  
**Date:** November 12, 2026  
**Status:** Architecture Planning & Roadmap (Implementation Pending PC Approval)

---

## 1. Executive Summary

This document specifies the mobile architecture for the future **Param Pharma Android Application**. 

The mobile application is intended for field operations:
- Van distribution and on-the-spot customer deliveries.
- Field collection of customer payments (Cash, Cheque, UPI receipts).
- On-site medicine stock checking and batch expiry inspection for retail chemists.
- Instant invoice generation and receipt printing via Bluetooth thermal printers.

**Core Rule**: The Android app will communicate exclusively with the existing Python FastAPI backend. **Zero business logic, statutory GST rules, FIFO inventory deductions, or accounting ledgers will be duplicated in the mobile client**.

---

## 2. Technology Evaluation: React Native (Expo) vs. Flutter

| Dimension | React Native with Expo (Managed) | Flutter (Dart) | Recommendation & Evaluation |
|---|---|---|---|
| **Code Reuse & Synergy** | **High**: Shares TypeScript interfaces, API schemas, and validation rules with the React web frontend. | **Low**: Requires rewriting all data models, DTOs, and networking in Dart. | **Advantage: React Native** |
| **Development Velocity** | Rapid: Familiar component patterns, JSX, and TypeScript ecosystem. | Moderate: Separate tooling and ecosystem. | **Advantage: React Native** |
| **Performance on Budget Android** | High: Modern Hermes JavaScript engine provides sub-100ms startup and low memory footprint. | High: Compiled to native ARM code. | **Tie** |
| **Barcode / QR Scanning** | `expo-camera` provides instant native barcode/QR scanning. | `mobile_scanner` plugin. | **Tie** |
| **Bluetooth Thermal Printing** | Rich ESC/POS printer libraries (`react-native-thermal-printer`). | Available packages for ESC/POS. | **Tie** |
| **Secure Token Storage** | `expo-secure-store` backed by hardware Android Keystore. | `flutter_secure_storage`. | **Tie** |
| **Single-User Project Fit** | High: Same full-stack skillset, zero context-switching overhead. | Moderate: Requires dual-language maintenance. | **Advantage: React Native** |

### Architectural Recommendation
**React Native with Expo (Managed Workflow, TypeScript, Hermes Engine)** is the strongly recommended framework. It guarantees seamless alignment with our existing TypeScript domain models and maximizes developer efficiency.

---

## 3. System Architecture & Communication

```
┌───────────────────────────────────────────────┐
│           Param Pharma Android App            │
│       (React Native Expo + TypeScript)        │
└───────────────────────┬───────────────────────┘
                        │ HTTPS (TLS 1.2 / 1.3)
                        │ JSON REST API + Idempotency-Key
                        ▼
┌───────────────────────────────────────────────┐
│            FastAPI Backend Server             │
│        Authoritative GST & Stock Engine       │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│        MongoDB Atlas M0 / SQLite WAL          │
│            Persistent Data Store              │
└───────────────────────────────────────────────┘
```

---

## 4. Security & Authentication Architecture

1. **Hardware-Backed Keystore**:
   - Access tokens (JWT) and refresh tokens will be stored securely using `expo-secure-store`, utilizing Android's hardware-backed KeyStore and encrypted shared preferences.
2. **Biometric Quick Login**:
   - Field login supported via `expo-local-authentication` (Fingerprint / Face Unlock), eliminating tedious password typing on mobile.
3. **Idempotency Protection**:
   - Every invoice or payment submitted from mobile will include a client-generated `Idempotency-Key` (UUIDv4) header. If network connectivity drops mid-request and the request retries, the backend prevents duplicate sales bills or duplicate payment credits.
4. **No Direct Database Access**:
   - The mobile application will never contain database credentials or connect directly to MongoDB Atlas.

---

## 5. Offline-First Synchronization Strategy

Field connectivity across rural or semi-urban areas in Kutch can be intermittent. The mobile sync model:

1. **Read-Only Local Cache**:
   - Customer Master directory, Product catalog (names, MRP, PTR, GST rates), and current available stock will be cached locally using SQLite (`expo-sqlite`).
   - Clearly displays "Last synced: [Time]" so the user knows if data is stale.
2. **Transactional Actions Require Network**:
   - Creating invoices and finalizing receipts requires connectivity to the FastAPI backend to ensure live stock locks and prevent selling stock that was already billed on the PC.
3. **Offline Queue (Future Phase)**:
   - Only after conflict resolution protocols are verified will queued offline invoices be considered.

---

## 6. Mobile Hardware Capabilities

- **Camera Scanner**: Instant batch barcode scanning (`expo-camera`) to populate medicine fields without manual typing.
- **Dynamic UPI Payment**: Native Android Intent integration triggering Google Pay, PhonePe, or Paytm directly via `upi://pay` deep links.
- **Bluetooth ESC/POS Printing**: 2-inch / 3-inch thermal receipt generation for van deliveries.
- **WhatsApp Direct**: Android `Linking.openURL('whatsapp://send?phone=...')` for 1-click invoice delivery.

---
*End of Mobile Architecture Plan. Implementation strictly deferred until PC application is finalized.*
