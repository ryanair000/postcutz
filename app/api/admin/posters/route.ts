import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import sharp, { type Metadata } from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailIsAdmin } from "@/lib/auth";
import { PORTAL } from "@/lib/portal";
import { buildPosterWatermarkSvg } from "@/lib/poster-watermark";
import { safeFileName, slugify } from "@/lib/utils";

export const runtime = "nodejs";

const metaSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(2).max(50),
  credit_cost: z.coerce.number().int().min(1).max(20),
  status: z.enum(["draft", "published"])
});

function orientedDimensions(metadata: Metadata) {
  const swapsAxes = metadata.orientation && metadata.orientation >= 5 && metadata.orientation <= 8;
  return {
    width: swapsAxes ? metadata.height : metadata.width,
    height: swapsAxes ? metadata.width : metadata.height
  };
}

async function createWatermarkedPreview(input: Buffer) {
  const resized = await sharp(input)
    .rotate()
    .resize({ width: 1080, height: 1080, fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  const width = resized.info.width;
  const height = resized.info.height;
  const watermark = buildPost…9966 tokens truncated…003e=10"
      }
    },
    "node_modules/sharp": {
      "version": "0.35.3",
      "resolved": "https://registry.npmjs.org/sharp/-/sharp-0.35.3.tgz",
      "integrity": "sha512-ej0zVHuZGHCiABXcNxeYhpRnPNPAcvbG8RMdBAhDAxLKkCRVSpK3Iyu7qbqw3JMzoj0REeM6f3tJLtVwl0023Q==",
      "license": "Apache-2.0",
      "dependencies": {
        "@img/colour": "^1.1.0",
        "detect-libc": "^2.1.2",
        "semver": "^7.8.5"
      },
      "engines": {
        "node": ">=20.9.0"
      },
      "funding": {
        "url": "https://opencollective.com/libvips"
      },
      "optionalDependencies": {
        "@img/sharp-darwin-arm64": "0.35.3",
        "@img/sharp-darwin-x64": "0.35.3",
        "@img/sharp-freebsd-wasm32": "0.35.3",
        "@img/sharp-libvips-darwin-arm64": "1.3.2",
        "@img/sharp-libvips-darwin-x64": "1.3.2",
        "@img/sharp-libvips-linux-arm": "1.3.2",
        "@img/sharp-libvips-linux-arm64": "1.3.2",
        "@img/sharp-libvips-linux-ppc64": "1.3.2",
        "@img/sharp-libvips-linux-riscv64": "1.3.2",
        "@img/sharp-libvips-linux-s390x": "1.3.2",
        "@img/sharp-libvips-linux-x64": "1.3.2",
        "@img/sharp-libvips-linuxmusl-arm64": "1.3.2",
        "@img/sharp-libvips-linuxmusl-x64": "1.3.2",
        "@img/sharp-linux-arm": "0.35.3",
        "@img/sharp-linux-arm64": "0.35.3",
        "@img/sharp-linux-ppc64": "0.35.3",
        "@img/sharp-linux-riscv64": "0.35.3",
        "@img/sharp-linux-s390x": "0.35.3",
        "@img/sharp-linux-x64": "0.35.3",
        "@img/sharp-linuxmusl-arm64": "0.35.3",
        "@img/sharp-linuxmusl-x64": "0.35.3",
        "@img/sharp-webcontainers-wasm32": "0.35.3",
        "@img/sharp-win32-arm64": "0.35.3",
        "@img/sharp-win32-ia32": "0.35.3",
        "@img/sharp-win32-x64": "0.35.3"
      },
      "peerDependenciesMeta": {
        "@types/node": {
          "optional": true
        }
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.1",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/styled-jsx": {
      "version": "5.1.6",
      "license": "MIT",
      "dependencies": {
        "client-only": "0.0.1"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "peerDependencies": {
        "react": ">= 16.8.0 || 17.x.x || ^18.0.0-0 || ^19.0.0-0"
      },
      "peerDependenciesMeta": {
        "@babel/core": {
          "optional": true
        },
        "babel-plugin-macros": {
          "optional": true
        }
      }
    },
    "node_modules/tslib": {
      "version": "2.8.1",
      "license": "0BSD"
    },
    "node_modules/typescript": {
      "version": "5.9.3",
      "dev": true,
      "license": "Apache-2.0",
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/undici-types": {
      "version": "6.21.0",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/zod": {
      "version": "3.25.76",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/colinhacks"
      }
    }
  }
}
