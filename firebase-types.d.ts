// Firebase v12 uses @firebase/* scoped packages for types.
// Re-export them under the public-facing "firebase/*" paths.
declare module "firebase/app" {
  export * from "@firebase/app";
}
declare module "firebase/firestore" {
  export * from "@firebase/firestore";
}
