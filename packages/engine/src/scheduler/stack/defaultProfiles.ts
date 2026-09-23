import type { IStackProfile } from "./IStackProfile.js";

/**
 * Built-in standard stack profiles providing language-agnostic rules,
 * test runners, and architecture directives.
 */
export const DEFAULT_STACK_PROFILES: readonly IStackProfile[] = [
  {
    id: "typescript-nodenext",
    name: "TypeScript (NodeNext / ESM)",
    description: "Modern ECMAScript module resolution with mandatory relative .js extensions.",
    markers: [
      { file: "tsconfig.json", contentContains: "nodenext" },
      { file: "tsconfig.json", contentContains: "node16" }
    ],
    defaultTestRunner: "npm test",
    directives: [
      "ECMAScript Module Resolution (NodeNext): All relative imports must include explicit '.js' extensions.",
      "Strict TypeScript: Explicit typing on all parameters and returns. No 'any' or 'unknown'.",
      "Zero Emojis: Strictly NO emojis in code, comments, strings, or commit messages, unless it is specifically an emoji feature being implemented."
    ],
    defaultScrubberRules: [
      "EmojiScrubberRule",
      "EsmRelativeImportScrubberRule",
      "ExtensionHeuristicScrubberRule",
      "BannedImportsScrubberRule"
    ]
  },
  {
    id: "typescript-bundler",
    name: "TypeScript (Bundler / Standard)",
    description: "Bundler-based TypeScript (Vite, Next.js, Angular, esbuild) with bare imports.",
    markers: [
      { file: "tsconfig.json", contentContains: "bundler" },
      { file: "vite.config.ts" },
      { file: "angular.json" },
      { file: "next.config.js" },
      { file: "next.config.mjs" }
    ],
    defaultTestRunner: "npm test",
    directives: [
      "Standard Module Resolution: Relative imports should omit file extensions.",
      "Strict TypeScript: Explicit typing on all parameters and returns. No 'any' or 'unknown'.",
      "Zero Emojis: Strictly NO emojis in code, comments, strings, or commit messages, unless it is specifically an emoji feature being implemented."
    ],
    defaultScrubberRules: [
      "EmojiScrubberRule",
      "ExtensionHeuristicScrubberRule",
      "BannedImportsScrubberRule"
    ],
    defaultDisabledScrubbers: ["EsmRelativeImportScrubberRule"]
  },
  {
    id: "java-maven",
    name: "Java (Maven)",
    description: "Java application or library managed via Maven build lifecycle.",
    markers: [{ file: "pom.xml" }],
    defaultTestRunner: "mvn test",
    directives: [
      "Java Clean Code: Adhere to standard Java package structures mirroring src/main/java and src/test/java.",
      "Explicit Signatures: Strict public/private visibility and full generics type annotations.",
      "Zero Emojis: Strictly NO emojis in code, comments, strings, or commit messages, unless it is specifically an emoji feature being implemented."
    ],
    defaultScrubberRules: ["EmojiScrubberRule", "JavaPackageScrubberRule", "BannedImportsScrubberRule"],
    defaultDisabledScrubbers: ["EsmRelativeImportScrubberRule", "ExtensionHeuristicScrubberRule"]
  },
  {
    id: "java-gradle",
    name: "Java (Gradle)",
    description: "Java application or library managed via Gradle build wrapper.",
    markers: [{ file: "build.gradle" }, { file: "build.gradle.kts" }],
    defaultTestRunner: "./gradlew test",
    directives: [
      "Java Clean Code: Adhere to standard Java package structures mirroring src/main/java and src/test/java.",
      "Explicit Signatures: Strict public/private visibility and full generics type annotations.",
      "Zero Emojis: Strictly NO emojis in code, comments, strings, or commit messages, unless it is specifically an emoji feature being implemented."
    ],
    defaultScrubberRules: ["EmojiScrubberRule", "JavaPackageScrubberRule", "BannedImportsScrubberRule"],
    defaultDisabledScrubbers: ["EsmRelativeImportScrubberRule", "ExtensionHeuristicScrubberRule"]
  },
  {
    id: "go",
    name: "Go (Golang)",
    description: "Go application with Go modules.",
    markers: [{ file: "go.mod" }],
    defaultTestRunner: "go test ./...",
    directives: [
      "Go Idioms: Handle errors explicitly; do not panic in standard library or service code.",
      "Strict Formatting: Adhere to gofmt conventions.",
      "Zero Emojis: Strictly NO emojis in code, comments, strings, or commit messages, unless it is specifically an emoji feature being implemented."
    ],
    defaultScrubberRules: ["EmojiScrubberRule"],
    defaultDisabledScrubbers: [
      "EsmRelativeImportScrubberRule",
      "ExtensionHeuristicScrubberRule",
      "JavaPackageScrubberRule"
    ]
  },
  {
    id: "rust",
    name: "Rust (Cargo)",
    description: "Rust project managed via Cargo.",
    markers: [{ file: "Cargo.toml" }],
    defaultTestRunner: "cargo test",
    directives: [
      "Rust Idioms: Strict ownership, pattern matching, Result/Option error handling without unwrap().",
      "Zero Emojis: Strictly NO emojis in code, comments, strings, or commit messages, unless it is specifically an emoji feature being implemented."
    ],
    defaultScrubberRules: ["EmojiScrubberRule"],
    defaultDisabledScrubbers: [
      "EsmRelativeImportScrubberRule",
      "ExtensionHeuristicScrubberRule",
      "JavaPackageScrubberRule"
    ]
  }
];

export const GENERIC_STACK_PROFILE: IStackProfile = {
  id: "generic",
  name: "Generic / Polyglot",
  description: "Fallback baseline configuration for unspecified programming environments.",
  markers: [],
  defaultTestRunner: "npm test",
  directives: [
    "Quality Standards: Adhere strictly to SOLID principles, modularity, and explicit typing.",
    "Documentation: Comment code thoroughly explaining how and why functionality is structured.",
    "Zero Emojis: Strictly NO emojis in code, comments, strings, or commit messages, unless it is specifically an emoji feature being implemented."
  ],
  defaultScrubberRules: ["EmojiScrubberRule"]
};
