import {
  H5PSemanticsValidator,
  sanitizeHtml,
  type H5PSemanticsField,
} from "../src/modules/h5p/h5p-semantics.js";

export async function runH5PSemanticsValidationTests(): Promise<{ passed: boolean; message: string }> {
  try {
    // -------------------------------------------------------------------------
    // 1. HTML Sanitization Unit Tests
    // -------------------------------------------------------------------------
    const maliciousStrings = [
      {
        input: "<p>Welcome</p><script>alert('XSS')</script>",
        expectedExclude: "<script>",
      },
      {
        input: '<img src="invalid.jpg" onerror="alert(document.cookie)">',
        expectedExclude: "onerror=",
      },
      {
        input: '<a href="javascript:stealTokens()">Click Here</a>',
        expectedExclude: "javascript:",
      },
      {
        input: '<iframe src="https://malicious-site.com"></iframe>',
        expectedExclude: "<iframe",
      },
    ];

    for (const testCase of maliciousStrings) {
      const sanitized = sanitizeHtml(testCase.input);
      if (sanitized.toLowerCase().includes(testCase.expectedExclude)) {
        return {
          passed: false,
          message: `HTML sanitization failed to strip '${testCase.expectedExclude}' from: ${testCase.input}`,
        };
      }
    }

    // Verify safe markup is preserved
    const safeHtml = "<p>Please review <b>Section 4.2</b> of the safety manual.</p>";
    if (sanitizeHtml(safeHtml) !== safeHtml) {
      return { passed: false, message: "HTML sanitization stripped safe markup" };
    }

    // -------------------------------------------------------------------------
    // 2. Semantics Schema & Field Validation
    // -------------------------------------------------------------------------
    const testSemantics: H5PSemanticsField[] = [
      {
        name: "title",
        type: "text",
        label: "Slide Title",
        optional: false,
      },
      {
        name: "durationSeconds",
        type: "number",
        label: "Duration",
        optional: false,
        default: 30,
      },
      {
        name: "autoPlay",
        type: "boolean",
        label: "Autoplay Video",
        optional: true,
        default: false,
      },
      {
        name: "displayMode",
        type: "select",
        label: "Display Mode",
        options: [
          { value: "compact", label: "Compact" },
          { value: "full", label: "Full Screen" },
        ],
        optional: false,
      },
      {
        name: "interactiveGroup",
        type: "group",
        label: "Interaction Settings",
        fields: [
          { name: "scoreEnabled", type: "boolean", label: "Enable Scoring", default: true },
          { name: "maxScore", type: "number", label: "Maximum Score", optional: false },
        ],
      },
      {
        name: "questions",
        type: "list",
        label: "Questions",
        field: {
          name: "questionText",
          type: "text",
          label: "Question Text",
          optional: false,
        },
      },
    ];

    // Positive validation test
    const validParams = {
      title: "Chemical Spill Response <script>bad()</script>",
      durationSeconds: 45,
      autoPlay: true,
      displayMode: "full",
      interactiveGroup: {
        scoreEnabled: true,
        maxScore: 100,
      },
      questions: [
        "What is the first step when discovering a spill?",
        "Where is the emergency eye wash station?",
      ],
    };

    const validResult = H5PSemanticsValidator.validate(testSemantics, validParams);
    if (!validResult.isValid || validResult.errors.length > 0) {
      return {
        passed: false,
        message: `Expected valid parameters to pass: ${JSON.stringify(validResult.errors)}`,
      };
    }

    // Verify sanitization occurred in filteredParameters
    const filteredTitle = String(validResult.filteredParameters.title);
    if (filteredTitle.includes("<script>")) {
      return { passed: false, message: "filteredParameters title contains unescaped script tag" };
    }

    // -------------------------------------------------------------------------
    // 3. Negative Field Validation Tests
    // -------------------------------------------------------------------------
    // Missing required field 'title'
    const missingRequired = {
      durationSeconds: 30,
      displayMode: "full",
    };
    const missingRes = H5PSemanticsValidator.validate(testSemantics, missingRequired);
    if (missingRes.isValid || !missingRes.errors.some((e) => e.field === "title")) {
      return { passed: false, message: "Expected missing required 'title' field to fail validation" };
    }

    // Invalid select value
    const badSelect = {
      title: "Valid Title",
      durationSeconds: 30,
      displayMode: "INVALID_MODE",
    };
    const badSelectRes = H5PSemanticsValidator.validate(testSemantics, badSelect);
    if (badSelectRes.isValid || !badSelectRes.errors.some((e) => e.field === "displayMode")) {
      return { passed: false, message: "Expected invalid select option to fail validation" };
    }

    // Invalid number type
    const badNum = {
      title: "Valid Title",
      durationSeconds: "NOT_A_NUMBER",
      displayMode: "compact",
    };
    const badNumRes = H5PSemanticsValidator.validate(testSemantics, badNum);
    if (badNumRes.isValid || !badNumRes.errors.some((e) => e.field === "durationSeconds")) {
      return { passed: false, message: "Expected invalid number field to fail validation" };
    }

    return {
      passed: true,
      message:
        "HTML sanitization (script/iframe/onerror/javascript), semantics field validation (text, number, boolean, select, group, list), and filteredParameters production verified",
    };
  } catch (err) {
    return { passed: false, message: err instanceof Error ? err.message : String(err) };
  }
}
