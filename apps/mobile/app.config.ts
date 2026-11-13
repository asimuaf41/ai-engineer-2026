// Why variants exist: development, preview and production builds must install side by side on one phone.
// Each gets its own name, app ID and URL scheme, so the OS treats them as three different apps.
// This file runs on the build machine (or your Mac), never inside the app. It extends app.json.
import type { ConfigContext, ExpoConfig } from "expo/config";

type Variant = "development" | "preview" | "production";

const VARIANTS: Record<Variant, { name: string; idSuffix: string; scheme: string }> = {
  development: { name: "Shipwright Dev", idSuffix: ".dev", scheme: "shipwright-dev" },
  preview: { name: "Shipwright Preview", idSuffix: ".preview", scheme: "shipwright-preview" },
  production: { name: "Shipwright", idSuffix: "", scheme: "shipwright" },
};

function readVariant(value: string | undefined): Variant {
  // Unset means a local command, which is a development build.
  if (value === undefined || value === "") return "development";
  if (value === "development" || value === "preview" || value === "production") return value;
  throw new Error(`APP_VARIANT must be "development", "preview" or "production", got "${value}".`);
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = VARIANTS[readVariant(process.env.APP_VARIANT)];

  return {
    ...config,
    name: variant.name,
    slug: config.slug ?? "shipwright-mobile",
    scheme: variant.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: `${config.ios?.bundleIdentifier}${variant.idSuffix}`,
    },
    android: {
      ...config.android,
      package: `${config.android?.package}${variant.idSuffix}`,
    },
  };
};
