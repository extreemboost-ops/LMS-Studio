# H5P Content Instance & Player Bundle Delivery

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.4 — H5P Core Engine Integration & Library Management  
**Date:** November 2026  
**Status:** `IMPLEMENTED & VERIFIED`

---

## 1. Content Instance Binding

An interactive project authors its visual experience through an `H5PContent` instance tied 1:1 to a `ContentProject`:

```
ContentProject (Title, Workspace, Status)
       |
       v (1:1 relation)
H5PContent
  |-- libraryId (Foreign key to main H5PLibrary)
  |-- parameters (Raw authoring JSON)
  |-- filteredParameters (Sanitized delivery JSON)
  |-- metadata (Author, license, language)
  |-- embedType (DIV | IFRAME)
  |-- contentLibraries (Many-to-many join tracking loaded libraries)
```

---

## 2. Client Player Bundle Rendering

When an author previews content or a learner launches an H5P module, `H5PContentService.getContentInstance` packages the complete player bundle:

```json
{
  "id": "c9a0c102-1234-4567-89ab-cdef01234567",
  "contentProjectId": "b8a0c102-1234-4567-89ab-cdef01234567",
  "library": {
    "id": "a7a0c102-1234-4567-89ab-cdef01234567",
    "machineName": "H5P.CoursePresentation",
    "title": "Course Presentation",
    "version": "1.24.5",
    "runnable": true,
    "fullscreen": true
  },
  "parameters": { ... },
  "filteredParameters": { ... },
  "metadata": { "title": "Safety Presentation", "license": "CC-BY" },
  "embedType": "DIV",
  "assets": {
    "styles": [
      "/h5p/libraries/FontAwesome-4.5/font-awesome.css",
      "/h5p/libraries/H5P.JoubelUI-1.3/joubel-ui.css",
      "/h5p/libraries/H5P.CoursePresentation-1.24/course-presentation.css"
    ],
    "scripts": [
      "/h5p/core/js/jquery.js",
      "/h5p/core/js/h5p.js",
      "/h5p/libraries/H5P.JoubelUI-1.3/joubel-ui.js",
      "/h5p/libraries/H5P.CoursePresentation-1.24/course-presentation.js"
    ],
    "dependencies": [ ... ]
  }
}
```

This self-contained structure allows the client iframe or web component to initialize `H5P.init()` immediately without client-side dependency resolution round-trips.
