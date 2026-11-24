# 04 — SCORM Manifest Generation & Packaging Specification

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.5 — SCORM 1.2 & 2004 Runtime & Packaging Engine  
**Standards:** IMS CP v1.1.2 / v1.1.4, ADL SCORM 1.2 / 2004 4th Edition  

---

## 1. Overview

The packager service (`SCORMPackagerService`) automates the creation of standard SCORM packages (ZIP archives) from content project versions. Every package contains:
1. `imsmanifest.xml`: Valid IMS Content Packaging document specifying metadata, organizations, items, and resource identifiers.
2. `scorm-bridge.js`: Universal client adapter exposing standard `API` (SCORM 1.2) or `API_1484_11` (SCORM 2004) communication bridges.
3. Content assets, stylesheets, scripts, and media.
4. Cryptographic SHA-256 manifest and archive checksums stored in `scorm_packages.checksum_sha256`.

---

## 2. Manifest Schema Specifications

### 2.1 SCORM 1.2 XML Specification
```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST-PROJ01-1700000000" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p2 imsmd_rootv1p2p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p1p2 adlcp_rootv1p1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org_default">
    <organization identifier="org_default">
      <title>Hazard Communication &amp; Safety</title>
      <item identifier="item_1" identifierref="res_1">
        <title>Hazard Communication &amp; Safety</title>
        <adlcp:masteryscore>80</adlcp:masteryscore>
        <adlcp:datafromlms></adlcp:datafromlms>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm-bridge.js"/>
      <file href="data/content.json"/>
    </resource>
  </resources>
</manifest>
```

### 2.2 SCORM 2004 4th Edition Specification
```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST-PROJ01-1700000000" version="1.0"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="org_default">
    <organization identifier="org_default">
      <title>Emergency Response Protocols</title>
      <item identifier="item_1" identifierref="res_1">
        <title>Emergency Response Protocols</title>
        <imsss:sequencing>
          <imsss:deliveryControls tracked="true" completionSetByContent="true" objectiveSetByContent="true"/>
          <imsss:objectives>
            <imsss:primaryObjective objectiveID="PRIMARY_OBJ" satisfiedByMeasure="true">
              <imsss:minNormalizedMeasure>0.800</imsss:minNormalizedMeasure>
            </imsss:primaryObjective>
          </imsss:objectives>
        </imsss:sequencing>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm-bridge.js"/>
    </resource>
  </resources>
</manifest>
```

---

## 3. Universal Client Adapter (`scorm-bridge.js`)

The packaged `scorm-bridge.js` implements a resilient discovery algorithm:
1. Crawls `window.parent` and `window.opener` up to 10 ancestor frames to locate `window.API` (1.2) or `window.API_1484_11` (2004).
2. Provides unified methods:
   - `ScormBridge.initialize()`
   - `ScormBridge.getValue(element)`
   - `ScormBridge.setValue(element, value)`
   - `ScormBridge.commit()`
   - `ScormBridge.terminate()`
3. If no LMS runtime is detected (e.g. standalone browser preview or authoring canvas inspection), it logs warnings and falls back to an in-memory simulation mode without breaking execution.
