
# Versioning Guidelines

This document explains how the project versioning is structured for the Doichain repository hosted on GitHub. The version format follows a specific pattern:

## 📌 Version Format
```
dc7.0.8120
```

## 🔍 Components of the Version
1. **Prefix**: `dc`
   - Indicates the Doichain-specific versioning system.

2. **Base Version**: `7.0.8`
   - This part is inherited from the original project at [BlueWallet GitHub Repository](https://github.com/BlueWallet/BlueWallet.git).

3. **Build Number**: `120`
   - Represents the Android build number. This is incremented for each new Android release without following the semantic versioning structure `X.Y.Z`.

## 🚀 Special Notes for Platforms

### Android
- Each new version for Android includes a unique build number that does not conform to the standard semantic versioning format (`X.Y.Z`).
- The build number ensures that every Android release has a distinct version for distribution.
- To solve the issue to keep the base version visible until next BlueWallet rease, we just add the buildnumber to the baseversion like so(`X.Y.Z${ANDROIDBUILDNO}`).

### App Store (iOS)
- Apple App Store does NOT require the version number to be incremented with each submission.
- It can increment the build number for each release
- Therefore we use the Bndroid build number also in the iOS version no matter which build number like so: (`X.Y.Z${ANDROIDBUILDNO}`) 

## 🏷️ Tagging System
- Each version tag provides a clear mapping to the original project version, the Android release, and the iOS release.
- Tags in GitHub reflect the versioning of both Android & iOS.

## 💡 Example
- **Git Tag**: `dc7.0.8120` 
  - `dc`: Doichain prefix
  - `7.0.8`: Original project version from BlueWallet
  - `120`: Android build number
  - `7.0.8120`: The version for iOS and Android 

## 📝 Summary
This versioning approach maintains a clear connection to the base project BlueWallet while respecting mobile platform specific versioning standard. 
